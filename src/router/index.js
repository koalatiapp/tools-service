const { MOCK_MODE } = require("../config");
let status;
let tools;

if (MOCK_MODE) {
	status = require("../controllers/mock/status");
	tools = require("../controllers/mock/tools");
} else {
	status = require("../controllers/status");
	tools = require("../controllers/tools");
}

module.exports = (app) => {
	// Status controller
	app.get("/status/up", status.up);
	app.get("/status/queue", status.queue);
	app.get("/status/time-estimates", status.timeEstimates);
	app.get("/status/project", status.project);

	// Tools controller
	app.post("/tools/request", tools.request);
};
