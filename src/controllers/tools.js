const queue = require('../utils/queue')();

module.exports = {
    request: async (req, res) => {
        const responseBody = {
            success: true,
            message: '',
        };

        try {
            await queue.add(req.body);
        } catch (error) {
            responseBody.success = false;
            responseBody.message = error.message;
        }

        res.send(responseBody);
    }
}
