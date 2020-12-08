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

**:warning: This remains to be documented.**

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
