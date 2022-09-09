const { isValidTool } = require("./tool.js");
const createDatabaseClient = require("./database.js");
const { MAX_CONCURRENT_SAME_HOST_REQUESTS } = require("../config");
const processIdentifier = require("./processIdentifier.js");

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
		// Build and run the actual query
		await this._waitForDatabaseConnection();
		const [rows] = await this.database.query(`
			SELECT r.*
			FROM requests r
			WHERE r.completed_at IS NULL
		`);

		if (rows.length == 0) {
			return null;
		}

		return Queue.pickNextRequest(rows, currentUrl);
	}

	/**
	 * @returns {string} Datetime string from which requests are considered "glitched" and ready to pick up for processing again.
	 */
	static getReprocessDate()
	{
		const now = new Date();
		now.setMinutes(now.getMinutes() - 2);

		const offset = now.getTimezoneOffset();
		const datetimeParts = new Date(now.getTime() + (offset * 60 * 1000)).toISOString().split("T");

		return `${datetimeParts[0]} ${datetimeParts[1].substring(0, 8)}`;
	}

	/**
	 * Analyzes a set of requests, selects the next one to process
	 * and returns it.
	 *
	 * @param {array} rows
	 * @param {string|null} currentUrl
	 */
	static pickNextRequest(rows, currentUrl = null) {
		const pendingCountPerHostname = new Map();
		const hostnamesCurrentlyProcessedByThisWorker = new Set();
		const reprocessDate = Queue.getReprocessDate();

		for (const row of rows) {
			// Requests that have been "processing" for more than 2 minutes
			if (row.processed_at && row.processed_at <= reprocessDate) {
				row.processed_at = null;
				row.processed_by = null;
			}

			if (row.processed_at) {
				// Calculate the number of concurrent same-host requests that are currently being processed
				pendingCountPerHostname.set(row.hostname, (pendingCountPerHostname.get(row.hostname) || 0) + 1);

				// Flag hostnames that are being processed by this very worker at the moment
				if (row.processed_by == processIdentifier) {
					hostnamesCurrentlyProcessedByThisWorker.add(row.hostname);
				}
			}
		}

		const filteredRows = rows.filter(row => {
			// Never process two requests from the same hostname simultaneously on the same worker
			if (hostnamesCurrentlyProcessedByThisWorker.has(row.hostname)) {
				return false;
			}

			// Don't exceed the MAX_CONCURRENT_SAME_HOST_REQUESTS
			if (pendingCountPerHostname.get(row.hostname) >= MAX_CONCURRENT_SAME_HOST_REQUESTS) {
				return false;
			}

			return true;
		});

		// Prioritize the remaining rows
		const sortedRows = filteredRows.sort((rowA, rowB) => {
			// To speed up processing, same-page requests are prioritized as they prevent unnecessary page reloads
			if (currentUrl) {
				if (rowA.url == currentUrl) {
					return -1;
				}

				if (rowB.url == currentUrl) {
					return 1;
				}
			}

			if (rowA.priority != rowB.priority) {
				return rowA.priority > rowB.priority ? -1 : 1;
			}

			if (rowA.received_at != rowB.received_at) {
				return rowA.received_at > rowB.received_at ? 1 : -1;
			}

			return 0;
		});

		return sortedRows[0] || null;
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
