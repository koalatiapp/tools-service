# Webhook notifications
After a request is processed, its result must be sent to Koalati's users. This is done via the `Notify` utility class.

The `Notify` utility class definees three static methods, which are defined below. Those methods can be called to send a `POST` request to the URL defined by the `WEBHOOK_HOST` and `WEBHOOK_PATH` environment variables.

- `requestSuccess(request, results, processingTime)`:submits the results of a request so they can be communicated to the Koalati user(s) who requested them. This request can be identified in the webhook's receiving script by the `type` POST variable, which is set at `toolSuccess`.
- `requestError(request, message)`: submits data about an error so it can be communicated to the Koalati user(s) who are expecting the results of the request. This request can be identified in the webhook's receiving script by the `type` POST variable, which is set at `toolError`.
- `developerError(request, message, errorData = null)`: submits data about an error so it can be communicated to the tool's developer(s). This request can be identified in the webhook's receiving script by the `type` POST variable, which is set at `developerError`.
