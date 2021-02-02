let status;
let tools;

if (process.env.MOCK_API == "true") {
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

	// Tools controller
	app.post("/tools/request", tools.request);
};
