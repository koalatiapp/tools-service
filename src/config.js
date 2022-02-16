const maxConcurrentPages = parseInt(process.env.BROWSER_MAX_CONCURRENT_PAGES || "3");

module.exports = {
	...process.env,
	PORT: process.env.PORT || 3000,
	MOCK_MODE: process.env.MOCK_API == "true",
	BROWSER_MAX_CONCURRENT_PAGES: parseInt(maxConcurrentPages),
	BROWSER_MAX_CONCURRENT_CONTEXTS: parseInt(process.env.BROWSER_MAX_CONCURRENT_CONTEXTS || maxConcurrentPages),
	MAX_CONCURRENT_SAME_HOST_REQUESTS: parseInt(process.env.MAX_CONCURRENT_SAME_HOST_REQUESTS ?? "10"),
	WEBHOOK_HOST: process.env.WEBHOOK_HOST || null,
	WEBHOOK_PATH: process.env.WEBHOOK_PATH || null,
	SENTRY_DSN: process.env.SENTRY_DSN || null,
	PAGELOAD_MAX_ATTEMPTS: parseInt(process.env.PAGELOAD_MAX_ATTEMPTS ?? "3"),
	PAGELOAD_TIMEOUT: parseInt(process.env.PAGELOAD_TIMEOUT ?? "5000"),
	PAGELOAD_GRACE_PERIOD: parseInt(process.env.PAGELOAD_GRACE_PERIOD ?? "10000"),
};
