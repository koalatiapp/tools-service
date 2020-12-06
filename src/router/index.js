const status = require('../controllers/status');
const tools = require('../controllers/tools');

module.exports = (app) => {
    // Status controller
    app.get('/status/queue', status.queue);
    app.get('/status/time-estimates', status.timeEstimates);

    // Tools controller
    app.post('/tools/request', tools.request);
};
