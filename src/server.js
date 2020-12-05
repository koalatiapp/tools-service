require('dotenv').config()

const PORT = process.env.PORT || 8080;
const { Pool } = require('pg');
const express = require('express');
const bodyParser = require('body-parser');
const pool = new Pool();
const queue = require('./utils/queue')(pool);
const app = express();
const initializeRoutes = require('./router');

app.use(bodyParser.urlencoded({ extended: true }));
initializeRoutes(app);

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});
