const status = require('../controllers/status');
const tools = require('../controllers/tools');

module.exports = (app) => {
    // Status controller
    app.post('/status', status.status);

    // Tools controller
    app.post('/tools/request', tools.request);
};
