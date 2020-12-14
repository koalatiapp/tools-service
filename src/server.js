require('dotenv').config()

const PORT = process.env.PORT || 8080;
const { Pool } = require('pg');
const express = require('express');
const bodyParser = require('body-parser');
const pool = new Pool();
const queue = require('./utils/queue')(pool);
const processorManager = require('./utils/processorManager')();
const app = express();
const initializeRoutes = require('./router');
const initializeAuthentication = require('./utils/authentication');

app.use(bodyParser.urlencoded({ extended: true }));

// Initialize the app
initializeAuthentication(app);
initializeRoutes(app);

// Start listening for requests...
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});
