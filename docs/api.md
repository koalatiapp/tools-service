# API

## Authentication
All requests to the tools service must require authentication.

To authenticate your requests, you must add a Bearer token header. This header should contain a JWT, in the payload of which the access token is defined under the  `access_token` key. (ex.: `{ "access_token": "my_access_token" }`).

The secret key for the encoding of the JWT is defined in the `JWT_SECRET` environment variable, and the access token is defined in the `AUTH_ACCESS_TOKEN` environment variable.

## Available endpoints
Below are the endpoints made available by the tools service. For more information, take a look at [the routing script](https://github.com/koalatiapp/tools-service/blob/master/src/router/index.js).

### Tools endpoints
- `/tools/request`: accepts a request object with the following properties: `url`, `tool`, and `priority`. Both `url` and `tool` can be either a string or an array of strings. `priority` is expected to be an integer, an defaults to `1` when invalid or unspecified.

### Status endpoints
- `/status/up`: returns the uptime of the service.
- `/status/queue`: returns the number of pending and unassigned requests in the queue.
- `/status/time-estimates`: returns processing & waiting time estimates for each tool, for both low and high priority requests.
- `/status/project`: returns processing status and progress for a given project URL (checks all requests starting with the provided URL)
