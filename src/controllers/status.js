const queue = require('../utils/queue')();

module.exports = {
    status: async (req, res) => {
        const responseBody = {
            success: true,
            message: '',
        };



        res.send(responseBody);
    }
}
