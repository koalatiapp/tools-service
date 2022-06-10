const { PG_DATABASE_CA_CERT } = require("../config");
const config = {};

if (PG_DATABASE_CA_CERT) {
	const certBuffer = Buffer.from(PG_DATABASE_CA_CERT, "base64");

	console.log("Using CA certificate from PG_DATABASE_CA_CERT environment variable.");

	config.ssl = {
		rejectUnauthorized: false,
		ca: certBuffer.toString(),
	};
}

module.exports = config;
