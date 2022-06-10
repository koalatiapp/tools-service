const { Client } = require("pg");
const config = require("../config/pg.js");

module.exports = () => {
	const client = new Client(config);

	client.connect();

	return client;
};
