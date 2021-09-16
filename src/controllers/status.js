const queue = require("../utils/queue")();

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

		if (typeof req.body.url == "undefined") {
			res.send({
				success: false,
				message: "Missing `url` GET parameter."
			});
			return;
		}

		const projectUrl = req.body.url;
		const pendingRequests = await queue.getRequestsMatchingUrl(projectUrl);
		responseBody.data.pending = pendingRequests.length > 0;
		responseBody.data.requestCount = pendingRequests.length;

		// Check if an estimated time can be calculated
		try {
			const timesByTool = (await queue.getAverageProcessingTimes()).average;
			let estimatedTime = 0;

			for (const request of pendingRequests) {
				let timeLeftForRequest = timesByTool[request.tool].completion_time;

				// substract the time that has already elapsed since the request was created
				const receivedTimestamp = (new Date(request.received_at)).getTime();
				const currentTimestamp = (new Date()).getTime();
				const timeSinceRequestReceived = currentTimestamp - receivedTimestamp;
				timeLeftForRequest -= timeSinceRequestReceived;

				estimatedTime += Math.max(timeLeftForRequest, 1000);
			}

			responseBody.data.timeEstimate = estimatedTime;
		} catch (error) {
			responseBody.message = "The estimated processing time could not be obtained.";
		}

		res.send(responseBody);
	}
};
