# Koalati tools web service

This is the web service that handles requests for all website testing on Koalati.

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
**:warning: This remains to be documented.**

## Available endpoints
**:warning: This remains to be documented.**

## Environment variables

The tools web service requires the following environment variables to be defined. 
An `.env` file can be added at the root of the project to define these; simply use the provided `.env.dist` file as a template.

| **Environment variable** | **Type** | **Description**                       |
|--------------------------|----------|---------------------------------------|
| PORT                     | Integer  | Port number for the web service       |
| WEBHOOK_URL              | String   | URL to push completions and errors to |
| PGHOST                   | String   | Postgres database domain or IP        |
| PGUSER                   | String   | Postgres database username            |
| PGPASSWORD               | String   | Postgres database password            |
| PGDATABASE               | String   | Postgres database name                |
| PGPORT                   | Integer  | Postgres database port number         |
