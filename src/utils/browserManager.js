const puppeteer = require("puppeteer");
const sleep = require("./sleep");
const {
	BROWSER_MAX_CONCURRENT_PAGES,
	BROWSER_MAX_CONCURRENT_CONTEXTS,
	PAGELOAD_MAX_ATTEMPTS,
	PAGELOAD_TIMEOUT,
	PAGELOAD_GRACE_PERIOD,
} = require("../config");

// Singleton
class BrowserManager {
	constructor() {
		this.browser = null;
		this.browserLaunchingPromise = null;
	}

	async launchBrowser() {
		if (this.browserLaunchingPromise !== null) {
			await this.browserLaunchingPromise;
			return;
		}

		const managerInstance = this;
		const launchOptions = {
			args: [
				"--disable-web-security",
				"--no-sandbox"
			],
			headless: true,
		};

		try {
			this.browserLaunchingPromise = puppeteer.launch(launchOptions);
			this.browser = await this.browserLaunchingPromise;
		} catch (error) {
			// Fallback for ARM machines where the bundled Chromium installation fails
			console.warn("Chromium failed to launch with bundled binary.");
			console.warn("Attempting to launch with the `apt` version instead.");

			launchOptions.executablePath = "/usr/bin/chromium";

			this.browserLaunchingPromise = puppeteer.launch(launchOptions);
			this.browser = await this.browserLaunchingPromise;

			console.log("Chromium launch successful!");
		}

		this.browser.on("disconnected", () => {
			managerInstance.browser = null;
		});

		this.browserLaunchingPromise = null;
	}

	async ensureBrowserIsUp() {
		if (!this.browser) {
			await this.launchBrowser();
		}
	}

	async launchPage() {
		await this.ensureBrowserIsUp();

		if (await this.hasReachedMaxLoad()) {
			throw new Error("Cannot launch any more pages or browser contexts: the maximum load is reached.");
		}

		const context = await this.browser.createIncognitoBrowserContext();
		const page = await context.newPage();

		await Promise.all([
			page.setExtraHTTPHeaders({ DNT: "1" }),
			page.setViewport({ width: 1920, height: 1080 }),
			page.setCacheEnabled(false),
		]);

		return { context, page };
	}

	async availableContextSpots() {
		await this.ensureBrowserIsUp();

		const contexts = this.browser.browserContexts();
		// Puppeteer always has one context up and running by default - don't count it.
		return BROWSER_MAX_CONCURRENT_CONTEXTS - (contexts.length - 1);
	}

	async hasReachedMaxLoad() {
		if (!(await this.availableContextSpots())) {
			return true;
		}

		const pages = await this.browser.pages();
		if (pages.length > BROWSER_MAX_CONCURRENT_PAGES) {
			return true;
		}

		return false;
	}

	getConsoleMessageCollectionTemplate() {
		return { errors: [], warnings: [], others: [] };
	}

	initConsoleMessageCollection(page, storageObj) {
		page.on("pageerror", ({ message }) => {
			storageObj.errors.push(message);
		}).on("requestfailed", request => {
			if (request.failure()) {
				storageObj.errors.push(`${request.failure().errorText} ${request.url()}`);
			}
		}).on("console", message => {
			const type = message.type().substr(0, 3).toUpperCase();
			const key = { ERR: "errors", WAR: "warnings" }[type] || "others";
			storageObj[key].push(message.text());
		});
	}

	/**
	 * Loads the page at the provided URL, retrying in case of timeouts.
	 *
	 * A grace period is used between a failed attempt and a new attempt in order
	 * to allow smaller web servers to process the existing requests and reduce
	 * the chances that our request times out.
	 *
	 * @param {puppeteer.Page} page Instance of a Puppeteer page in which to load the URL
	 * @param {string} url URL of the page to load
	 * @param {int} maxPageLoadAttempts Maximum number of attempts (default: `5`)
	 * @param {int} timeoutDuration Initial timeout duration in milliseconds (default: `5000`)
	 * @param {int} gracePeriod Duration before a new attempt is made after a failed attempt,
	 * 							in milliseconds (default: `10000`)
	 */
	async loadUrlWithRetries(page, url, maxPageLoadAttempts, timeoutDuration, gracePeriod) {
		let response = null;

		maxPageLoadAttempts = maxPageLoadAttempts ?? PAGELOAD_MAX_ATTEMPTS;
		timeoutDuration = timeoutDuration ?? PAGELOAD_TIMEOUT;
		gracePeriod = gracePeriod ?? PAGELOAD_GRACE_PERIOD;

		for (let attemptCount = 1; attemptCount <= maxPageLoadAttempts; attemptCount++) {
			try {
				response = await page.goto(url, { waitUntil: "networkidle0",  timeout: timeoutDuration });
				break;
			} catch (error) {
				if (attemptCount == maxPageLoadAttempts) {
					throw new Error(`The following page timed out and could not be loaded: ${url}`);
				}

				await sleep(gracePeriod);
			}
		}

		if (response.status().toString().substring(0, 1) != "2") {
			throw new Error(`The following page returned an error ${response.status()}: ${url}`);
		}
	}

	async close()
	{
		if (this.browserLaunchingPromise !== null) {
			await this.browserLaunchingPromise;
		}

		if (this.browser) {
			await this.browser.close();
		}
	}

	getMaxConcurrentPages()
	{
		return BROWSER_MAX_CONCURRENT_PAGES;
	}

	getMaxConcurrentContexts()
	{
		return BROWSER_MAX_CONCURRENT_CONTEXTS;
	}
}

let browserManagerInstance = null;
module.exports = () => {
	if (!browserManagerInstance) {
		browserManagerInstance = new BrowserManager();
	}
	return browserManagerInstance;
};
