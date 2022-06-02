const { http } = require("follow-redirects");
const { WEBHOOK_HOST, WEBHOOK_PATH } = require("../config");
const sleep = require("./sleep");

module.exports = class Notify {
	static _stringifyBody(body)
	{
		const postParams = new URLSearchParams({
			payload: JSON.stringify(body)
		});

		return postParams.toString();
	}

	static _prepareOptions(queryString)
	{
		return {
			hostname: WEBHOOK_HOST,
			path: WEBHOOK_PATH,
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": queryString.length
			},
			agent: false,
		};
	}

	/**
	 * @returns {Promise}
	 */
	static _post(body) {
		console.log(`Sending webhook request to ${WEBHOOK_HOST || "[missing host]"}...`);

		if (!WEBHOOK_HOST) {
			throw new Error("You must define the WEBHOOK_HOST and WEBHOOK_PATH environment variable.");
		}

		const postQueryString = this._stringifyBody(body);
		const options = this._prepareOptions(postQueryString);
		const maxRetryAttempts = 6;
		let attemptNumber = 1;

		const checkToTryAgain = function(resolve) {
			if (attemptNumber <= maxRetryAttempts) {
				const delay = 5000 * attemptNumber;

				// Let's give the other server some breathing room in case it's busy, and try again later
				console.log(`Waiting ${delay}ms before trying again...`);
				sleep(delay).then(() => {
					attemptNumber += 1;
					sendPostRequest(resolve);
				});
			} else {
				// The server had its chance, let's just forget about that request.
				// @TODO: Implement a queue of pending notifications with a standalone service to send/process them
				console.log(`Tried ${attemptNumber} times without success; giving up on this request...`);
				resolve();
			}
		};
		const sendPostRequest = function (resolve) {
			const req = http.request(options, function (res) {
				// check the returned response code
				if (("" + res.statusCode).match(/^2\d\d$/)) {
					// Request handled, happy
					console.log(`Webhook request received by server: received HTTP ${res.statusCode}`);
					resolve();
				} else if (("" + res.statusCode).match(/^5\d\d$/)) {
					// Server error, I have no idea what happend in the backend
					// but server at least returned correctly (in a HTTP protocol
					// sense) formatted response
					console.log(`Webhook request failed on the webhook's side: received HTTP ${res.statusCode}`);
					checkToTryAgain(resolve);
				} else {
					console.log(`Webhook request returned unexpected result: received HTTP ${res.statusCode}`);
					resolve();
				}
			});

			req.on("error", (e) => {
				console.error(e);
			});

			req.on("timeout", function () {
				console.log("Webhook request timed out");
				req.destroy();
				checkToTryAgain(resolve);
			});

			req.setTimeout(5000);
			req.write(postQueryString);
			req.end();
		};

		return new Promise(sendPostRequest);
	}

	/**
	 * @returns {Promise}
	 */
	static requestSuccess(request, results, processingTime) {
		return Notify._post({
			request: request,
			results: results,
			processingTime: processingTime,
			success: true,
			type: "toolSuccess",
		});
	}

	/**
	 * @returns {Promise}
	 */
	static requestError(request, message) {
		return Notify._post({
			request: request,
			error: message,
			success: false,
			type: "toolError",
		});
	}

	/**
	 * @returns {Promise}
	 */
	static developerError(request, message, errorData = null) {
		return Notify._post({
			request: request,
			message: message,
			error: errorData,
			type: "developerError",
		});
	}
};
