require("dotenv").config();

const { MOCK_MODE, PORT } = require("./config");
const express = require("express");

if (!MOCK_MODE) {
	require("./utils/sentry");
	require("./utils/processorManager")();
}

const app = express();
const initializeRoutes = require("./router");
const initializeAuthentication = require("./utils/authentication");
const morgan = require("morgan");

app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));

// Initialize the app
initializeAuthentication(app);
initializeRoutes(app);

// Start listening for requests...
app.listen(PORT, () => {
	console.log(`Running on ${MOCK_MODE ? "MOCK" : "PRODUCTION"} mode.`);
	console.log(`Server listening on port ${PORT}...`);
});
