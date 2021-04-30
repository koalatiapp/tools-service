const { isValidTool } = require("./tool.js");
const psl = require("psl");

// Singleton
class Queue {
	constructor(pool) {
		if (typeof pool != "object") {
			throw new Error(`The Queue constructor expects a Postgres Pool object, but received ${typeof pool}`);
		}

		this.pool = pool;
	}

	async add({ url, tool, priority }) {
		if (!priority) {
			priority = 1;
		}

		// Handle requests for multiple tools by calling the add method individually for every requested tool
		if (Array.isArray(tool)) {
			for (const singleTool of tool) {
				await this.add({
					url: url,
					tool: singleTool,
					priority: priority
				});
			}
			return;
		}

		// Handle requests for multiple URLs by calling the add method individually for every requested URL
		if (Array.isArray(url)) {
			for (const singleUrl of url) {
				await this.add({
					url: singleUrl,
					tool: tool,
					priority: priority
				});
			}
			return;
		}

		if (!url || !tool || typeof url != "string" || typeof tool != "string") {
			throw new Error(`Invalid request: missing url and/or tool parameter: ${JSON.stringify({ url, tool, priority })}.`);
		}

		if (!isValidTool(tool)) {
			throw new Error(`Invalid tool requested. ${tool} is either not a valid Koalati tool, or it is not installed.`);
		}

		/*
         * If an unprocessed request for this exact URL & tool already exists, there is no need to duplicate it.
         * Just skip this request: both requesters will be notified when the existing is processed.
         */
		const existingRequest = await this.getUnprocessedMatchingRequest(url, tool);
		if (existingRequest) {
			// If the new request has a higher priority than the existing one, update the existing request to bump its priority.
			if (priority > existingRequest.priority) {
				await this.updateRequestPriority(existingRequest.id, priority);
			}

			return;
		}

		// Extract the hostname from the URL
		const domainInfo = psl.parse(url);
		const hostname = [domainInfo.subdomain, domainInfo.domain].filter(part => !!(part ?? "").length).join(".");

		// Insert the request in the database
		await this.pool.query(`
            INSERT INTO requests (url, hostname, tool, priority) VALUES ($1, $2, $3)
        `, [url, hostname, tool, priority]);
	}

	async getUnprocessedMatchingRequest(url, tool) {
		const res = await this.pool.query(`
            SELECT *
            FROM requests
            WHERE completed_at IS NULL
            AND url = $1
            AND tool = $2
        `, [url, tool]);
		return res.rowCount > 0 ? res.rows[0] : null;
	}

	async updateRequestPriority(requestId, newPriority) {
		await this.pool.query(`
            UPDATE requests
            SET priority = $1
            WHERE id = $2
        `, [newPriority, requestId]);
	}

	async next(currentUrl = null) {
		const data = [];
		const orderBys = [];
		/**
         * The base query prevents processing more than 2 request for the same website at once.
         * This often ends up slowing down the website's server in a very noticeable way, which ends up slowing the service for all.
         */
		const baseQuery = `
            SELECT *
            FROM requests r
			LEFT JOIN requests shr ON shr.hostname = r.hostname AND shr.id != r.id AND shr.processed_at IS NOT NULL AND shr.completed_at IS NULL
            WHERE R.processed_at IS NULL
			AND COUNT(shr.id) <= 1`;

		// To speed up processing, same-page requests are prioritized as they prevent unnecessary page reloads
		if (currentUrl) {
			const urlParamName = "$" + (orderBys.length + 1);
			orderBys.push(`CASE WHEN R.url = ${urlParamName} THEN 0 ELSE 1 END ASC`);
			data.push(currentUrl);
		}

		/**
         * @TODO: implement the queue's priority algorithm for premium/regular users.
         * Higher priority requests should be prioritized (processed first).
         * However, every N high-priority (2+) requests, X low-priority (1) request should be treated.
         * The N and X number for the algorithm should be environment variables, so it can be changed easily without issuing new commits.
         */
		orderBys.push("priority DESC");

		orderBys.push("received_at ASC");

		// Build and run the actual query
		const query = baseQuery + (orderBys ? (" ORDER BY " + orderBys.join(", ")) : "");
		const result = await this.pool.query(query, data);

		return result.rowCount ? result.rows[0] : null;
	}

	async markAsProcessing(requestId) {
		await this.pool.query(`
            UPDATE requests
            SET processed_at = NOW()
            WHERE id = $1
        `, [requestId]);
	}

	async markAsCompleted(requestId, processingTime) {
		await this.pool.query(`
            UPDATE requests
            SET completed_at = NOW(),
            processing_time = $1
            WHERE id = $2
        `, [processingTime, requestId]);
	}

	async pendingCount() {
		const res = await this.pool.query(`
            SELECT COUNT(*) AS "count"
            FROM requests
            WHERE processed_at IS NOT NULL
            AND completed_at IS NULL
        `);
		return res.rows[0].count;
	}

	async nonAssignedCount() {
		const res = await this.pool.query(`
            SELECT COUNT(*) AS "count"
            FROM requests
            WHERE processed_at IS NULL
        `);
		return res.rows[0].count;
	}

	async getAverageProcessingTimes() {
		const timesByTool = {
			lowPriority: {},
			highPriority: {},
		};
		const lowPriorityResult = await this.pool.query(`
            SELECT tool, ROUND(AVG(processing_time)) AS processing_time, ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - received_at))) * 1000) AS completion_time
            FROM requests
            WHERE completed_at IS NOT NULL
            AND priority = 1
            GROUP BY tool
            LIMIT 10000;
        `);
		const highPriorityResult = await this.pool.query(`
            SELECT tool, ROUND(AVG(processing_time)) AS processing_time, ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - received_at))) * 1000) AS completion_time
            FROM requests
            WHERE completed_at IS NOT NULL
            AND priority > 1
            GROUP BY tool
            LIMIT 10000;
        `);

		for (const row of lowPriorityResult.rows) {
			timesByTool.lowPriority[row.tool] = {
				processing_time: row.processing_time,
				completion_time: row.completion_time
			};
		}

		for (const row of highPriorityResult.rows) {
			timesByTool.highPriority[row.tool] = {
				processing_time: row.processing_time,
				completion_time: row.completion_time
			};
		}

		return timesByTool;
	}
}

let queueInstance = null;
module.exports = (pool) => {
	if (!queueInstance) {
		queueInstance = new Queue(pool);
	}
	return queueInstance;
};
