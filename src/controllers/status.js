const { MAX_CONCURRENT_SAME_HOST_REQUESTS } = require("../config");
const estimateProcessingTime = require("../utils/estimateProcessingTime");
const createDatabaseClient = require("../utils/database.js");
const Queue = require("../utils/queue");

module.exports = {
	up: async (req, res) => {
		let databaseWorks = false;
		const database = await createDatabaseClient();

		try {
			const [rows] = await database.query("SELECT COUNT(*) FROM requests");

			databaseWorks = rows.length == 1;
		} catch (error) {
			console.error(error);
		} finally {
			await database.end();
		}

		const responseBody = {
			success: true,
			uptime: process.uptime(),
			database_up: databaseWorks,
		};

		res.send(responseBody);
	},

	queue: async (req, res) => {
		const queue = new Queue();
		const responseBody = {
			success: true,
			message: "",
			data: {
				unassignedRequests: await queue.nonAssignedCount(),
				pendingRequests: await queue.pendingCount(),
			},
		};

		await queue.disconnect();

		res.send(responseBody);
	},

	timeEstimates: async (req, res) => {
		const queue = new Queue();
		const responseBody = {
			success: true,
			message: "",
			data: null,
		};

		try {
			const timesByTool = await queue.getAverageProcessingTimes();
			responseBody.data = timesByTool;
			responseBody.data.maxConcurrentRequests = MAX_CONCURRENT_SAME_HOST_REQUESTS;
		} catch (error) {
			responseBody.success = false;
			responseBody.message = "The average processing times could not be obtained.";
		}

		await queue.disconnect();

		res.send(responseBody);
	},

	/**
	 * Returns the processing status and progress for a specified URL
	 */
	project: async (req, res) => {
		const queue = new Queue();
		const responseBody = {
			success: true,
			message: "",
			data: {
				pending: false,
				requestCount: null,
				timeEstimate: null,
			},
		};

		if (typeof req.query.url == "undefined") {
			res.send({
				success: false,
				message: "Missing `url` GET parameter."
			});
			return;
		}

		const projectUrl = req.query.url;
		const pendingRequests = await queue.getRequestsMatchingUrl(projectUrl);
		await queue.disconnect();

		responseBody.data.pending = pendingRequests.length > 0;
		responseBody.data.requestCount = pendingRequests.length;
		responseBody.data.timeEstimate = await estimateProcessingTime(pendingRequests);

		res.send(responseBody);
	}
};
