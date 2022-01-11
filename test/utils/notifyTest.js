const Notify = require("../../src/utils/notify.js");
const assert = require("assert");
const { WEBHOOK_HOST, WEBHOOK_PATH } = require("../../src/config");

describe("Notify (src/utils/notify.js)", () => {
	it("Should build the query string from a JSON object", () => {
		const body = {
			request: {
				id: 281,
				url: "https://www.toituresbellevue.com/",
				priority: 1,
				tool: "@koalati/tool-seo",
				received_at: "2021-03-29T01:14:12.125Z",
				processed_at: null,
				completed_at: null,
				processing_time: null
			},
			results: [
			],
			processingTime: 1000,
			success: true,
			type: "toolSuccess"
		};
		const expectedQueryString = "payload=%7B%22request%22%3A%7B%22id%22%3A281%2C%22url%22%3A%22https%3A%2F%2Fwww.toituresbellevue.com%2F%22%2C%22priority%22%3A1%2C%22tool%22%3A%22%40koalati%2Ftool-seo%22%2C%22received_at%22%3A%222021-03-29T01%3A14%3A12.125Z%22%2C%22processed_at%22%3Anull%2C%22completed_at%22%3Anull%2C%22processing_time%22%3Anull%7D%2C%22results%22%3A%5B%5D%2C%22processingTime%22%3A1000%2C%22success%22%3Atrue%2C%22type%22%3A%22toolSuccess%22%7D";

		assert.strictEqual(Notify._stringifyBody(body), expectedQueryString);
	});

	it("Should build POST request options", () => {
		const queryString = Notify._stringifyBody({ test: "value" });
		const expectedOptions = {
			hostname: WEBHOOK_HOST,
			path: WEBHOOK_PATH,
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": queryString.length
			},
			agent: false
		};

		assert.deepEqual(Notify._prepareOptions(queryString), expectedOptions);
	});
});
