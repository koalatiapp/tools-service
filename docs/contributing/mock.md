# Mock mode
Mock mode can be enabled by setting the `MOCK_API` environment variable to `true`.
When you do so, all of the responses will be sent right away without actually processing anything.

This doesn't change anything for request to the `/status/up` endpoints, but all other endpoints which depend on the queue will send mock responses.
This can be useful when you want to test API clients for the tool service without actually setting up a database and spending resources to process the requests.
