const http = require("http");
const webhookHost = process.env.WEBHOOK_HOST || null;
const webhookPath = process.env.WEBHOOK_PATH || null;

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
			hostname: webhookHost,
			path: webhookPath,
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": queryString.length
			},
			agent: false
		};
	}

	static _post(body) {
		if (webhookHost) {
			const postQueryString = this._stringifyBody(body);
			const options = this._prepareOptions(postQueryString);
			const req = http.request(options);

			req.on("error", (e) => {
				console.error(e);
			});

			req.write(postQueryString);
			req.end();
		} else {
			throw new Error("You must define the WEBHOOK_HOST and WEBHOOK_PATH environment variable.");
		}
	}

	static requestSuccess(request, results, processingTime) {
		return Notify._post({
			request: request,
			results: results,
			processingTime: processingTime,
			success: true,
			type: "toolSuccess",
		});
	}

	static requestError(request, message) {
		return Notify._post({
			request: request,
			error: message,
			success: false,
			type: "toolError",
		});
	}

	static developerError(request, message, errorData = null) {
		return Notify._post({
			request: request,
			message: message,
			error: errorData,
			type: "developerError",
		});
	}
};
