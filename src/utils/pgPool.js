const { Pool } = require("pg");
const fs = require("fs");

/**
 * If a root CA certficate is passed via the environment variables,
 * store it locally for usage with PG.
 */
function storeCertificateToFile()
{
	if (!process.env.PG_DATABASE_CA_CERT) {
		return;
	}

	const certBuffer = Buffer.from(process.env.PG_DATABASE_CA_CERT, "base64");
	const certContent = certBuffer.toString();
	const filename = process.env.PGSSLROOTCERT;

	fs.writeFileSync(filename, certContent);

	console.log(`Stored CA certificate to file in ${filename}`);
}

// Export the pool as a singleton
let poolInstance = null;
module.exports = () => {
	if (!poolInstance) {
		storeCertificateToFile();

		poolInstance = new Pool();
	}
	return poolInstance;
};
