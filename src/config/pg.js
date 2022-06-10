const { PG_DATABASE_CA_CERT } = require("../config");
const poolConfig = {
	statement_timeout: 10000,
	idle_in_transaction_session_timeout: 30000,
};

if (PG_DATABASE_CA_CERT) {
	const certBuffer = Buffer.from(PG_DATABASE_CA_CERT, "base64");

	console.log("Using CA certificate from PG_DATABASE_CA_CERT environment variable.");

	poolConfig.ssl = {
		rejectUnauthorized: false,
		ca: certBuffer.toString(),
	};
}

module.exports = poolConfig;
