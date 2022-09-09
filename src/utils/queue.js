const crypto = require("crypto");
const { isValidTool } = require("./tool.js");
const createDatabaseClient = require("./database.js");
const { MAX_CONCURRENT_SAME_HOST_REQUESTS } = require("../config");
const processIdentifier = crypto.randomBytes(20).toString("hex");

module.exports = class Queue {
	constructor()
	{
		this.database = null;
		this._databasePromise = createDatabaseClient()
			.then(client => this.database = client);
	}

	async _waitForDatabaseConnection()
	{
		await this._databasePromise;
	}

	async disconnect()
	{
		await this._waitForDatabaseConnection();
		await this.database.end();
	}

	async add(payload) {
		let { url, tool, priority } = payload;

		if (!priority) {
			priority = 1;
		}

		// Handle requests for multiple tools by calling the add method individually for every requested tool
		if (typeof tool == "object" && !Array.isArray(tool)) {
			tool = Object.values(tool);
		}

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
		if (typeof url == "object" && !Array.isArray(url)) {
			url = Object.values(url);
		}

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
			throw new Error(`Invalid request: testing request payload is missing url and/or tool parameter: ${JSON.stringify(payload)}.`);
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
		const hostname = (new URL(url)).hostname;

		// Insert the request in the database
		await this._waitForDatabaseConnection();
		await this.database.query(`
			INSERT INTO requests (url, hostname, tool, priority) VALUES (?, ?, ?, ?)
		`, [url, hostname, tool, priority]);
	}

	async getUnprocessedMatchingRequest(url, tool) {
		await this._waitForDatabaseConnection();

		const [rows] = await this.database.query(`
            SELECT *
            FROM requests
            WHERE completed_at IS NULL
            AND url = ?
            AND tool = ?
        `, [url, tool]);
		return rows.length > 0 ? rows[0] : null;
	}

	/**
	 * @param {string} url Base URL of the project. Every request that start with this URL will be returned.
	 * @returns {Promise<object[]>}
	 */
	async getRequestsMatchingUrl(url) {
		await this._waitForDatabaseConnection();

		const [rows] = await this.database.query(`
            SELECT *
            FROM requests
            WHERE completed_at IS NULL
            AND url LIKE ?
        `, [url + "%"]);

		return rows.length > 0 ? rows : [];
	}

	async updateRequestPriority(requestId, newPriority) {
		await this._waitForDatabaseConnection();
		await this.database.query(`
			UPDATE requests
			SET priority = ?
			WHERE id = ?
		`, [newPriority, requestId]);
	}

	async next(currentUrl = null) {

		// First check with a simple query if there's any requests to process at all
		await this._waitForDatabaseConnection();
		const [rowCount] = await this.database.query(`
			SELECT COUNT(r.id) as \`count\`
			FROM requests r
			WHERE r.completed_at IS NULL
			AND (
				r.processed_at IS NULL
				OR (r.completed_at IS NULL AND r.processed_at < (NOW() - interval 2 minute))
			)
		`);

		if (!rowCount.count) {
			return null;
		}

		const data = [processIdentifier];
		const orderBys = [];
		/**
         * The base query prevents processing more than [MAX_CONCURRENT_SAME_HOST_REQUESTS] requests for the same website at once.
         * This often ends up slowing down the website's server in a very noticeable way, which ends up slowing the service for all.
		 *
		 * It also prevents single instance of the tools service from processing multiple requests to the same host at once, as this
		 * often affects performance as well (both locally on the browser, and remotely on the website's server due to session locks).
		 *
		 * Side note:
		 * Requests that have been "in progress" for more than 3 minutes are considered not started as they likely have failed.
		 * These are brought back in the queue automatically in the request below.
         */
		const baseQuery = `
            SELECT r.*
            FROM requests r
			LEFT JOIN requests sameHostRequest
				ON sameHostRequest.hostname = r.hostname
				AND sameHostRequest.id != r.id
				AND sameHostRequest.processed_at IS NOT NULL
				AND sameHostRequest.processed_at >= (NOW() - interval 2 minute)
				AND sameHostRequest.completed_at IS NULL
			LEFT JOIN requests sameHostSameProcessRequest
				ON sameHostSameProcessRequest.hostname = r.hostname
				AND sameHostSameProcessRequest.id != r.id
				AND sameHostSameProcessRequest.processed_at IS NOT NULL
				AND sameHostSameProcessRequest.processed_at >= (NOW() - interval 2 minute)
				AND sameHostSameProcessRequest.completed_at IS NULL
				AND sameHostSameProcessRequest.processed_by = ?
            WHERE r.completed_at IS NULL
			AND (
				r.processed_at IS NULL
				OR (r.completed_at IS NULL AND r.processed_at < (NOW() - interval 2 minute))
			)
			GROUP BY r.id
			HAVING COUNT(sameHostRequest.id) <= ${MAX_CONCURRENT_SAME_HOST_REQUESTS - 1}
			AND COUNT(sameHostSameProcessRequest.id) = 0`;

		// To speed up processing, same-page requests are prioritized as they prevent unnecessary page reloads
		if (currentUrl) {
			orderBys.push("CASE WHEN r.url = ? THEN 0 ELSE 1 END ASC");
			data.push(currentUrl);
		}

		orderBys.push("priority DESC");
		orderBys.push("received_at ASC");

		// Build and run the actual query
		await this._waitForDatabaseConnection();
		const query = baseQuery + (orderBys ? (" ORDER BY " + orderBys.join(", ")) : "");
		const [rows] = await this.database.query(query, data);

		return rows.length ? rows[0] : null;
	}

	async markAsProcessing(requestId) {
		await this._waitForDatabaseConnection();
		return await this.database.query(`
            UPDATE requests
            SET processed_at = NOW(),
            processed_by = ?
            WHERE id = ?
        `, [processIdentifier, requestId]);
	}

	async markAsCompleted(request, processingTime) {
		await this._waitForDatabaseConnection();
		return await this.database.query(`
            UPDATE requests
            SET completed_at = NOW(),
            processing_time = ?
            WHERE url = ?
			AND tool = ?
			AND completed_at IS NULL
        `, [processingTime, request.url, request.tool]);
	}

	async pendingCount() {
		await this._waitForDatabaseConnection();
		const [rows] = await this.database.query(`
            SELECT COUNT(*) AS "count"
            FROM requests
            WHERE processed_at IS NOT NULL
            AND completed_at IS NULL
        `);
		return rows.count;
	}

	async nonAssignedCount() {
		await this._waitForDatabaseConnection();
		const [rows] = await this.database.query(`
            SELECT COUNT(*) AS "count"
            FROM requests
            WHERE processed_at IS NULL
        `);
		return rows[0].count;
	}

	async getAverageProcessingTimes() {
		await this._waitForDatabaseConnection();

		const timesByTool = {
			lowPriority: {},
			highPriority: {},
			average: {},
		};
		const [lowPriorityRows] = await this.database.query(`
            SELECT tool, ROUND(AVG(processing_time)) AS processing_time, ROUND(AVG(TIMESTAMPDIFF(SECOND, completed_at, received_at))) AS completion_time
            FROM requests
            WHERE completed_at IS NOT NULL
            AND priority = 1
            GROUP BY tool
            LIMIT 10000;
        `);
		const [highPriorityRows] = await this.database.query(`
            SELECT tool, ROUND(AVG(processing_time)) AS processing_time, ROUND(AVG(TIMESTAMPDIFF(SECOND, completed_at, received_at))) AS completion_time
            FROM requests
            WHERE completed_at IS NOT NULL
            AND priority > 1
            GROUP BY tool
            LIMIT 10000;
        `);
		const [averageRows] = await this.database.query(`
            SELECT tool, ROUND(AVG(processing_time)) AS processing_time, ROUND(AVG(TIMESTAMPDIFF(SECOND, completed_at, received_at))) AS completion_time
            FROM requests
            WHERE completed_at IS NOT NULL
            GROUP BY tool
            LIMIT 10000;
        `);

		for (const row of lowPriorityRows) {
			timesByTool.lowPriority[row.tool] = {
				processing_time: row.processing_time,
				completion_time: row.completion_time
			};
		}

		for (const row of highPriorityRows) {
			timesByTool.highPriority[row.tool] = {
				processing_time: row.processing_time,
				completion_time: row.completion_time
			};
		}

		for (const row of averageRows) {
			timesByTool.average[row.tool] = {
				processing_time: row.processing_time,
				completion_time: row.completion_time
			};
		}

		return timesByTool;
	}
};
