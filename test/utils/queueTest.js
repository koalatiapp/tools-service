const assert = require("assert");
const Queue = require("../../src/utils/queue.js");
const config = require("../../src/config.js");
const processIdentifier = require("../../src/utils/processIdentifier.js");

describe("Queue (src/utils/queue.js)", () => {

	it("Queue.pickNextRequest() -> returns the first request when there's no special criteria", () => {
		const requests = getMockRequests();
		const nextRequest = Queue.pickNextRequest(requests, null);
		assert.equal(nextRequest.url, "https://website-1/page-1");
	});

	it("Queue.pickNextRequest() -> prioritizes request on the same URL when provided", () => {
		const requests = getMockRequests();
		const nextRequest = Queue.pickNextRequest(requests, "https://website-1/page-4");
		assert.equal(nextRequest.url, "https://website-1/page-4");
	});

	it("Queue.pickNextRequest() -> filters out requests that exceed the concurrent same host request cap", () => {
		const requests = getMockRequests();
		const nextRequest = Queue.pickNextRequest(requests, "https://website-2/page-101");
		assert.equal(nextRequest.url, "https://website-1/page-1");
	});

	it("Queue.pickNextRequest() -> filters out requests matching a hostname that this worker is currently processing", () => {
		const requests = getMockRequests();
		requests[0].processed_at = "3000-02-02 02:02:02";
		requests[0].processed_by = processIdentifier;

		const nextRequest = Queue.pickNextRequest(requests, null);
		assert.equal(nextRequest.url, "https://website-3/page-201");
	});

	it("Queue.pickNextRequest() -> does not fail when duplicate requests are present", () => {
		const requests = [...getMockRequests(), ...getMockRequests()];
		const nextRequest = Queue.pickNextRequest(requests, null);
		assert.equal(nextRequest.url, "https://website-1/page-1");
	});

	it("Queue.pickNextRequest() -> runs in less than 1ms per 1000 requests, even with large queues", () => {
		const requestCount = 1000000;
		const requests = getMockRequests(requestCount);
		const msTimestampBefore = Date.now();
		Queue.pickNextRequest(requests, null);

		const msSpent = Date.now() - msTimestampBefore;
		const msPerThousandRequests = msSpent / (requestCount / 1000);

		assert.ok(msPerThousandRequests < 1, `Took ${msPerThousandRequests}ms per 1000 requests (${msSpent}ms total for ${requestCount} requests)`);
	});
});

function getMockRequests(requestCount = 1000)
{
	const requests = [];
	const now = new Date();
	const offset = now.getTimezoneOffset();
	const datetimeParts = new Date(now.getTime() + (offset * 60 * 1000)).toISOString().split("T");
	const mockDate = `${datetimeParts[0]} ${datetimeParts[1].substring(0, 8)}`;

	for (let i = 0; i < requestCount; i++) {
		const hostname = `website-${Math.floor(i / 100) + 1}`;
		const isBeingProcessed = hostname == "website-2" && i < 100 + config.MAX_CONCURRENT_SAME_HOST_REQUESTS;

		requests.push({
			id: i,
			url: `https://${hostname}/page-${i + 1}`,
			hostname: hostname,
			priority: 1,
			tool: "@koalati/tool-seo",
			received_at: mockDate,
			processed_by: isBeingProcessed ? "1a2b3c4d5e6f7g8h9i" : null,
			processed_at: isBeingProcessed ? mockDate : null,
			completed_at: null,
			processing_time: null,
		});
	}

	return requests;
}
