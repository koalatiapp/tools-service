const querystring = require("querystring");
const https = require("https");
const webhookHost = process.env.WEBHOOK_HOST || null;
const webhookPath = process.env.WEBHOOK_PATH || null;

module.exports = class Notify {
	static _post(body) {
		if (webhookHost) {
			const postData = querystring.stringify(body);
			const options = {
				hostname: webhookHost,
				port: 443,
				path: webhookPath,
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Content-Length": postData.length
				},
				rejectUnauthorized: false,
				requestCert: true,
				agent: false
			};
			const req = https.request(options);

			req.on("error", (e) => {
				console.error(e);
			});

			req.write(postData);
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
