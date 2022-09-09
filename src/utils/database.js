const fs = require("fs");
const mysql = require("mysql2/promise");

module.exports = async () => {
	const config = {
		host: process.env.DATABASE_HOST,
		user: process.env.DATABASE_USER,
		password: process.env.DATABASE_PASSWORD,
		database: process.env.DATABASE_NAME,
		ssl: {
			ca: fs.readFileSync(process.env.DATABASE_CA_CERT || "/etc/ssl/certs/ca-certificates.crt"),
		},
	};
	let client;

	try {
		client = await mysql.createConnection(config);
		await client.connect();
	} catch (err) {
		console.error("database connection error", err);
		process.exitCode = 1;
		throw err;
	}

	client.on("error", err => console.error("database error:", err.stack));
	client.on("notice", msg => console.warn("database notice:", msg));
	client.on("end", () => {
		console.log("closed database connection");
	});

	return client;
};
