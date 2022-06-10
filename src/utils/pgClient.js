const { Client } = require("pg");
const config = require("../config/pg.js");
let clientCount = 1;
let openCount = 0;

module.exports = () => {
	const clientId = clientCount;
	clientCount += 1;

	const client = new Client(config);

	client.connect(err => {
		if (err) {
			console.error(`postgres connection error (${clientId})`, err.stack);
		} else {
			openCount++;
			console.log(`established postgres connection ${clientId} (${openCount} open connections)`);
		}
	});

	client.on("error", err => console.error("postgres error:", err.stack));
	client.on("notice", msg => console.warn("postgres notice:", msg));
	client.on("end", () => {
		openCount--;
		console.log(`closed postgres connection ${clientId} (${openCount} open connections)`);
	});

	return client;
};
