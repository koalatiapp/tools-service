require("dotenv").config();

const { MOCK_MODE, PORT } = require("./config");
const express = require("express");

if (!MOCK_MODE) {
	const pool = require("./utils/pgPool")();
	require("./utils/sentry");
	require("./utils/queue")(pool);
	require("./utils/processorManager")();
}

const app = express();
const initializeRoutes = require("./router");
const initializeAuthentication = require("./utils/authentication");

app.use(express.urlencoded({ extended: true }));

// Initialize the app
initializeAuthentication(app);
initializeRoutes(app);

// Start listening for requests...
app.listen(PORT, () => {
	console.log(`Running on ${MOCK_MODE ? "MOCK" : "PRODUCTION"} mode.`);
	console.log(`Server listening on port ${PORT}...`);
});
