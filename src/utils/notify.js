const axios = require('axios');
const qs = require('qs');
const webhookUrl = process.env.WEBHOOK_URL || null;

module.exports = class Notify {
    static _post(body) {
        if (webhookUrl) {
            return axios.post(webhookUrl, body).catch;
        } else {
            console.error("You must define the WEBHOOK_URL envrionment variable.");
        }
    }

    static requestSuccess(request, results, processingTime) {
        return Notify._post({
            request: request,
            results: results,
            processingTime: processingTime,
            success: true,
            type: 'toolSuccess',
        });
    }

    static requestError(request, message) {
        return Notify._post({
            request: request,
            error: message,
            success: false,
            type: 'toolError',
        });
    }

    static developerError(request, message, errorData = null) {
        return Notify._post({
            request: request,
            message: message,
            error: errorData,
            type: 'developerError',
        });
    }
}
