const puppeteer = require("puppeteer");
const { BROWSER_MAX_CONCURRENT_PAGES, BROWSER_MAX_CONCURRENT_CONTEXTS } = require("../config");

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

		this.browserLaunchingPromise = puppeteer.launch({
			args: [
				"--disable-web-security",
				"--no-sandbox"
			],
			headless: true
		});

		this.browser = await this.browserLaunchingPromise;
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

	async loadUrlWithRetries(page, url, maxPageLoadAttempts = 3, timeoutDuration = 5000) {
		let response = null;

		for (let attemptCount = 1; attemptCount <= maxPageLoadAttempts; attemptCount++) {
			try {
				response = await page.goto(url, { waitUntil: "networkidle0",  timeout: timeoutDuration });
				break;
			} catch (error) {
				if (attemptCount == maxPageLoadAttempts) {
					throw new Error(`The page at the following URL could not be loaded within ${maxPageLoadAttempts} attempts (${Math.round((timeoutDuration * maxPageLoadAttempts) / 1000)} seconds wait time): ${url}`);
				}
			}
		}

		if (response.status().toString().substr(0, 1) != "2") {
			throw new Error(`The page at the following URL returned an error ${response.status()}: ${url}`);
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
