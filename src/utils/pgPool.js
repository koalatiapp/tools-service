const { Pool } = require("pg");

/**
 * If a root CA certficate is passed via the environment variables,
 * it will be returned by the function for usage in PG connections.
 */
function getCACertificateContents()
{
	if (!process.env.PG_DATABASE_CA_CERT) {
		return null;
	}

	const certBuffer = Buffer.from(process.env.PG_DATABASE_CA_CERT, "base64");
	return certBuffer.toString();
}

// Export the pool as a singleton
let poolInstance = null;
module.exports = () => {
	if (!poolInstance) {
		const sslCAContents = getCACertificateContents();

		if (sslCAContents) {
			console.log("Using CA certificate from PG_DATABASE_CA_CERT environment variable.");

			poolInstance = new Pool({
				ssl: {
					rejectUnauthorized: false,
					ca: sslCAContents,
				},
			});
		} else {
			poolInstance = new Pool();
		}
	}

	return poolInstance;
};
