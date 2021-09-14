require("dotenv").config();

const MOCK_MODE = process.env.MOCK_API == "true";
const PORT = process.env.PORT || 3000;
const express = require("express");
const bodyParser = require("body-parser");

if (!MOCK_MODE) {
	const pool = require("./utils/pgPool")();
	require("./utils/queue")(pool);
	require("./utils/processorManager")();
}

const app = express();
const initializeRoutes = require("./router");
const initializeAuthentication = require("./utils/authentication");

app.use(bodyParser.urlencoded({ extended: true }));

// Initialize the app
initializeAuthentication(app);
initializeRoutes(app);

// Start listening for requests...
app.listen(PORT, () => {
	console.log(`Running on ${MOCK_MODE ? "MOCK" : "PRODUCTION"} mode.`);
	console.log(`Server listening on port ${PORT}...`);
});
