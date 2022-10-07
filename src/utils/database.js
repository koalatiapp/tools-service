const fs = require("fs");
const mysql = require("mysql2/promise");
let hasCheckedToCreateTables = false;
let schemaCreationPromise = null;

module.exports = async () => {
	const config = {
		host: process.env.DATABASE_HOST,
		user: process.env.DATABASE_USER,
		password: process.env.DATABASE_PASSWORD,
		database: process.env.DATABASE_NAME,
		ssl: {
			ca: fs.readFileSync(process.env.DATABASE_CA_CERT || "/etc/ssl/certs/ca-certificates.crt"),
			rejectUnauthorized: !["0", "false"].includes(process.env.DATABASE_REJECT_UNAUTHORIZED),
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

	if (!hasCheckedToCreateTables) {
		hasCheckedToCreateTables = true;
		schemaCreationPromise = checkToCreateDatabaseSchema(client);
	}

	if (schemaCreationPromise) {
		await schemaCreationPromise;
	}

	return client;
};

async function checkToCreateDatabaseSchema(client)
{
	const [rows] = await client.query("SHOW TABLES LIKE 'requests'");
	const path = require("path");

	if (rows.length) {
		return;
	}

	console.log("Initializing the database schema...");

	const schemaSql = fs.readFileSync(path.resolve(__dirname, "../../config/schema.sql")).toString();

	for (let querySql of schemaSql.split(";")) {
		querySql = querySql.trim();

		if (!querySql || querySql.startsWith("--")) {
			continue;
		}

		await client.query(querySql);
	}

	schemaCreationPromise = null;
}
