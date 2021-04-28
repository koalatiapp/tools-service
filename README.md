# Koalati Tools API

This is the web service that handles requests for all website testing on Koalati.

## Getting started
The easiest way to get started is to use Docker Compose with the provided configurations.

1. Create and fill in your own `.env` file at the root of the project (take a look at the `.env.dist` file and to the [Environment variables](#environment-variables) section for reference).
2. Launch the API service by running `docker-compose up`.

## How it works

The web service has two main point of interest: the Queue and the ProcessorManager.

### The `Queue`
The queue class is a singleton defined in `src/utils/queue.js`.

When a new request comes in, it is analyzed and inserted into a processing queue (which is stored on an external Postgres database).

Requests have a basic `priority` level: the lower the number, the lower the priority.
By default, all requests are assigned a priority level of 1, unless a different priority is provided.
This basic priority system is how free _vs_ premium requests are handled: premium requests have a priority level of 2, and are therefore processed before free requests.

However, the `priority` level is not the only factor in the processing order algorithm. Every _nth_ premium request processed, a free request is processed (**:warning: this has not yet been implemented**).
This ensures that free users still get reasonable loading times, even if premium users are prioritized. The _nth_ number is defined by an environment variable ([see the Environment variables section](#environment-variables)).

Another factor that is taken into account is server load for the websites that being tested. To prevent overloading others servers,
no more than 3 requests of the same website will be processed at the same time. (**:warning: this has not yet been implemented**)

Finally, there is one last factor at play in the queue's processing order. If a request has just been completed by a `Processor`,
that request's URL is provided to the `Queue.next()` method, and the Queue will prioritize other requests on the same page before all others.
This is to optimize the overall processing time of the web service, as it reduces the total number of page loads that need to be done.

### The `Processor` and `ProcessorManager`

The `Processor` class represents the workers who take in requests, runs the Koalati tools on the requested URL, validates the results and passes them along to be sent to Koalati's users.

Each `Processor` manages a Puppeteer [Page](https://pptr.dev/#?product=Puppeteer&version=v5.5.0&show=api-class-page), which is launched automatically when a processor instance is created.

Its `processNextRequest()` method is where the magic happens. In it, the `Processor`:
- fetches the next request to process from the `Queue`;
- loads its target page using the BrowserManager's `loadUrlWithRetries()` utility method;
- creates an instance of the desired tool;
- runs the tool, providing it with all of the necessary data;
- validates the tool's results;
- runs the tool's cleanup mehod;
- marks the request as completed;
- submits the request's results (or error) to Koalati's users via the `Notify`'s `requestSuccess()` or `requestError()` & `developerError()` methods.

`Processor` instances are managed by the `ProcessorManager` singleton class. The manager's job is to spawn and despawn processor instances, depending on the number of requests to process. The maximum number of processors it can handle at once is limited by the `BROWSER_MAX_CONCURRENT_PAGES` environment variable, as each processor uses one page, and pages cannot be shared between processors.

#### `BrowserManager`
The `BrowserManager` is a singleton utility class that assists the `Processor` in all matters related to web browsers.

When the `BrowserManager` instance is first created, it launches a headless Chromium browser via [`puppeteer.launch()`](https://pptr.dev/#?product=Puppeteer&version=v5.5.0&show=api-puppeteerlaunchoptions). It then ensures that the browser is relaunched if it ever becomes unresponsive or closed by listening to the [Browser's `disconnected` event](https://pptr.dev/#?product=Puppeteer&version=v5.5.0&show=api-event-disconnected).

The BrowserManager's `launchPage()` method can be called to get a new page. All pages automatically come in their own incognito [BrowserContext](https://pptr.dev/#?product=Puppeteer&version=v5.5.0&show=api-class-browsercontext) in order to prevent any cache or sessions between different processors. The maximum number of concurrent pages the BrowserManager can spawn and handle is defined by the `BROWSER_MAX_CONCURRENT_PAGES` environment variable.

The BrowserManager also offers a few utility methods, such as:
- `initConsoleMessageCollection(page, storageObj)`: start collecting all console messages in the provided `storageObj`. Messages are grouped in the following categories: `errors`, `warnings`, `others`.
- `loadUrlWithRetries(page, url, maxPageLoadAttempts = 3, timeoutDuration = 5000)`: attempts to load a URL in the provided Puppeteer page, with retries if an error or a timeout occurs.


## Webhook notifications
After a request is processed, its result must be sent to Koalati's users. This is done via the `Notify` utility class.

The `Notify` utility class definees three static methods, which are defined below. Those methods can be called to send a `POST` request to the URL defined by the `WEBHOOK_URL` environment variable.

- `requestSuccess(request, results, processingTime)`:submits the results of a request so they can be communicated to the Koalati user(s) who requested them. This request can be identified in the webhook's receiving script by the `type` POST variable, which is set at `toolSuccess`.
- `requestError(request, message)`: submits data about an error so it can be communicated to the Koalati user(s) who are expecting the results of the request. This request can be identified in the webhook's receiving script by the `type` POST variable, which is set at `toolError`.
- `developerError(request, message, errorData = null)`: submits data about an error so it can be communicated to the tool's developer(s). This request can be identified in the webhook's receiving script by the `type` POST variable, which is set at `developerError`.

## Available endpoints
Below are the endpoints made available by the tools service. For more information, take a look at [the routing script](https://github.com/koalatiapp/tools-service/blob/master/src/router/index.js).

### Tools endpoints
- `/tools/request`: accepts a request object with the following properties: `url`, `tool`, and `priority`. Both `url` and `tool` can be either a string or an array of strings. `priority` is expected to be an integer, an defaults to `1` when invalid or unspecified.

### Status endpoints
- `/status/up`: returns the uptime of the service.
- `/status/queue`: returns the number of pending and unassigned requests in the queue.
- `/status/time-estimates`: returns processing & waiting time estimates for each tool, for both low and high priority requests.


## Authentication
All requests to the tools service must require authentication.

To authenticate your requests, you must add a Bearer token header. This header should contain a JWT, in the payload of which the access token is defined under the  `access_token` key. (ex.: `{ access_token: "my_access_token" }`).

The secret key for the encoding of the JWT is defined in the `JWT_SECRET` environment variable, and the access token is defined in the `AUTH_ACCESS_TOKEN` environment variable.


## Mock mode
Mock mode can be enabled by setting the `MOCK_API` environment variable to `true`.
When you do so, all of the responses will be sent right away without actually processing anything.

This doesn't change anything for request to the `/status/up` endpoints, but all other endpoints which depend on the queue will send mock responses.
This can be useful when you want to test API clients for the tool service without actually setting up a database and spending resources to process the requests.

## Environment variables

The tools web service requires the following environment variables to be defined.
An `.env` file can be added at the root of the project to define these; simply use the provided `.env.dist` file as a template.

| **Environment variable** | **Type** | **Description**                                      |
|--------------------------|----------|------------------------------------------------------|
| PORT                     | Integer  | Port number for the web service (default: `3000`)    |
| WEBHOOK_URL              | String   | URL to push completions and errors to                |
| JWT_SECRET               | String   | Secret key for the JWT (HS256)                       |
| AUTH_ACCESS_TOKEN        | String   | Access token used for authorization                  |
| MOCK_API                 | Boolean  | Set to `true` to mock responses without processing   |
| PGHOST *                 | String   | Postgres database domain or IP                       |
| PGUSER *                 | String   | Postgres database username                           |
| PGPASSWORD *             | String   | Postgres database password                           |
| PGDATABASE *             | String   | Postgres database name                               |
| PGPORT *                 | Integer  | Postgres database port number                        |

ℹ️ _The variables followed by an asterisk are optional when running the service in MOCK mode._

## Initializing the queue's database
To get started, you'll need to manually create the queue's table in the database if it doesn't exist already.  

You can do so by using the following query:

```pgsql
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    url TEXT,
    priority SMALLINT DEFAULT 1,
    tool VARCHAR(255),
    received_at TIMESTAMP DEFAULT now(),
    processed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    processing_time BIGINT NULL
);
```
