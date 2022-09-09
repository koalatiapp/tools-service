# Environment variables

The tools web service requires the following environment variables to be defined.
An `.env` file can be added at the root of the project to define these; simply use the provided `.env.dist` file as a template.

| **Environment variable**        | **Type** | **Description**                                                                                         |
|---------------------------------|----------|---------------------------------------------------------------------------------------------------------|
| DATABASE_HOST *                 | String   | Database hostname, as accepted by [mysql2](https://www.npmjs.com/package/mysql2)                        |
| DATABASE_USER *                 | String   | Database user, as accepted by [mysql2](https://www.npmjs.com/package/mysql2)                            |
| DATABASE_PASSWORD *             | String   | Database password string, as accepted by [mysql2](https://www.npmjs.com/package/mysql2)                 |
| DATABASE_NAME *                 | String   | Database name string, as accepted by [mysql2](https://www.npmjs.com/package/mysql2)                     |
| DATABASE_CA_CERT                | String   | Path to your CA certificate file ([learn more](https://planetscale.com/docs/concepts/secure-connections#ca-root-configuration))               |
| PORT                            | Integer  | Port number for the web service (default: `3000`)                                                       |
| WEBHOOK_HOST                    | String   | Webhook hostname to push completions and errors to                                                      |
| WEBHOOK_PATH                    | String   | Webhook URL path to push completions and errors to                                                      |
| JWT_SECRET                      | String   | Secret key for the JWT (HS256)                                                                          |
| AUTH_ACCESS_TOKEN               | String   | Access token used for authorization                                                                     |
| MOCK_API                        | Boolean  | Set to `true` to mock responses without processing                                                      |
| PAGELOAD_MAX_ATTEMPTS           | Integer  | Maximum number of attempts to retry loading a page. (default: `3`)         					           |
| PAGELOAD_TIMEOUT                | Integer  | Timeout duration for page loads, in milliseconds. (default: `5000`)         					           |
| PAGELOAD_GRACE_PERIOD           | Integer  | Duration of the grace period between two page load attempt, in milliseconds. (default: `10000`)         |
| BROWSER_MAX_CONCURRENT_PAGES    | Integer  | Maximum number of pages that can be open at once. (default: `3`)                                        |
| BROWSER_MAX_CONCURRENT_CONTEXTS | Integer  | Maximum number of browsing contexts that can be open at once. (default: `BROWSER_MAX_CONCURRENT_PAGES`) |
| MAX_CONCURRENT_SAME_HOST_REQUESTS | Integer  | Maximum number of requests for the same hostname that can be processed at once, shared across however many instances of this service. (default: `10`) |
| SENTRY_DSN                      | String   | DSN to track errors and performance with Sentry.io.                                                     |

ℹ️ _The variables followed by an asterisk are optional when running the service in MOCK mode._
