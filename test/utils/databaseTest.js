const createDatabaseConnection = require("../../src/utils/database.js");
const assert = require("assert");

describe("Database (src/utils/database.js)", () => {
	it("Can connect to the database", async () => {
		const database = await createDatabaseConnection();
		const [rows] = await database.query("SELECT 1");

		assert.equal(rows.length, 1);

		await database.end();
	});
});
