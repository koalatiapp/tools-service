const queue = require("../utils/queue")();
const { MAX_CONCURRENT_SAME_HOST_REQUESTS } = require("./config.js");
const estimateProcessingTime = require("../utils/estimateProcessingTime");

module.exports = {
	up: (req, res) => {
		const responseBody = {
			success: true,
			uptime: process.uptime(),
		};

		res.send(responseBody);
	},

	queue: async (req, res) => {
		const responseBody = {
			success: true,
			message: "",
			data: {
				unassignedRequests: await queue.nonAssignedCount(),
				pendingRequests: await queue.pendingCount(),
			},
		};

		res.send(responseBody);
	},

	timeEstimates: async (req, res) => {
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

		res.send(responseBody);
	},

	/**
	 * Returns the processing status and progress for a specified URL
	 */
	project: async (req, res) => {
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

		responseBody.data.pending = pendingRequests.length > 0;
		responseBody.data.requestCount = pendingRequests.length;
		responseBody.data.timeEstimate = await estimateProcessingTime(pendingRequests);

		res.send(responseBody);
	}
};
