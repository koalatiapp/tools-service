const queue = require('../utils/queue')();

module.exports = {
    queue: async (req, res) => {
        const responseBody = {
            success: true,
            message: '',
            data: null,
        };

        // @TODO: Implement /status/queue endpoint

        res.send(responseBody);
    },

    timeEstimates: async (req, res) => {
        const responseBody = {
            success: true,
            message: '',
            data: null,
        };

        try {
            const timesByTool = await queue.getAverageProcessingTimes();
            responseBody.data = timesByTool;
        } catch (error) {
            responseBody.success = false;
            responseBody.message = "The average processing times could not be obtained."
        }

        res.send(responseBody);
    }
}
