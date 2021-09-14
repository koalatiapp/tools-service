if (process.env.SENTRY_DSN || null) {
	const Sentry = require("@sentry/node");
	// eslint-disable-next-line no-unused-vars
	const Tracing = require("@sentry/tracing");

	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		tracesSampleRate: .1,
	});
}
