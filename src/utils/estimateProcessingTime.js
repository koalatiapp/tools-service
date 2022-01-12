const queue = require("./queue")();
const { MAX_CONCURRENT_SAME_HOST_REQUESTS } = require("../config");
let timesByToolPromise = queue.getAverageProcessingTimes();

// Refresh the times by tool every now and then
setInterval(() => { timesByToolPromise = queue.getAverageProcessingTimes(); }, 30000);

async function getAverageTimeForTool(tool) {
	const fallbackTime = 3000;

	try {
		const timesByTool = (await timesByToolPromise).average;
		const toolEstimates = timesByTool[tool] || {};

		return toolEstimates.processing_time || fallbackTime;
	} catch (err) {
		return fallbackTime;
	}
}

/**
 * Estimates the total amount of time it will take to process
 * the provided array of requests.
 *
 * This takes into account the concurrent processing of requests
 * from the same domain, assuming a 50% usage / load.
 *
 * @param {Array} requests Requests for which to estimate the processing time.
 * @param {Float} processingCapacityPercentage Percentage of the processing capacity that is used for calclations.
 * @returns {Promise<int>} Total processing time in milliseconds.
 */
module.exports = async function estimateProcessingTime(requests, processingCapacityPercentage = 0.5) {
	const timeByProcessor = {};
	const maxNbOfProcessors = Math.max(1, Math.floor(MAX_CONCURRENT_SAME_HOST_REQUESTS * processingCapacityPercentage));

	for (const request of requests) {
		let time = await getAverageTimeForTool(request.tool);
		let lowestIndex = 0;
		let lowestTime = null;

		// Deduct already elapsed time
		if (request.processed_at) {
			const msSinceStart = (new Date()).getTime() - (new Date(request.processed_at)).getTime();

			if (msSinceStart >= 0) {
				time -= msSinceStart;
			}
		}

		for (let processorIndex = 0; processorIndex < maxNbOfProcessors; processorIndex++) {
			if (lowestTime === null || (timeByProcessor[processorIndex] ?? 0) < lowestTime) {
				lowestIndex = processorIndex;
				lowestTime = timeByProcessor[processorIndex] ?? 0;
			}
		}

		timeByProcessor[lowestIndex] = (timeByProcessor[lowestIndex] ?? 0) + time;
	}

	return Math.max(...Object.values(timeByProcessor));
};
