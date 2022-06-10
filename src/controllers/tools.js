const processorManager = require("../utils/processorManager")();

module.exports = {
	request: async (req, res) => {
		const queue = require("../utils/queue")();
		const responseBody = {
			success: true,
			message: "",
		};

		try {
			// Add the request to the queue
			await queue.add(req.body);
			await queue.disconnect();

			// Poke the processor manager, in case it was inactive.
			processorManager.checkToHandleNewRequest();
		} catch (error) {
			responseBody.success = false;
			responseBody.message = error.message;
		}

		res.send(responseBody);
	}
};
