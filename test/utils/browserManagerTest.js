const launchBrowserManager = require("../../src/utils/browserManager.js");
const assert = require("assert");

describe("Browser Manager (src/utils/browserManager.js)", async () => {
	let browserManager = null;
	let pageLaunched = false;

	it("Should launch without errors", async () => {
		const newBrowserManager = launchBrowserManager();
		await newBrowserManager.ensureBrowserIsUp();
		browserManager = newBrowserManager;
	});

	/**
	 * @returns {Promise} Promise that resolves when the test page has been launched
	 */
	function waitForBrowserManager() {
		function checkBrowserManagerLaunched(resolve) {
			if (launchBrowserManager !== null) {
				resolve();
			} else {
				setTimeout(checkBrowserManagerLaunched.bind(this, resolve), 10);
			}
		}

		return new Promise(resolve => {
			checkBrowserManagerLaunched(resolve);
		});
	}

	/**
	 * @returns {Promise} Promise that resolves when the test page has been launched
	 */
	function waitForPageLaunch() {
		function checkPageLaunched(resolve) {
			if (pageLaunched) {
				resolve();
			} else {
				setTimeout(checkPageLaunched.bind(this, resolve), 10);
			}
		}

		return new Promise(resolve => {
			waitForBrowserManager().then(() => {
				checkPageLaunched(resolve);
			});
		});
	}

	it("Should start with all contexts spots available", async () => {
		const maxContexts = browserManager.getMaxConcurrentContexts();
		const availableContexts = await browserManager.availableContextSpots();
		assert.strictEqual(availableContexts, maxContexts);
	});

	it("Should be able to launch new page", async () => {
		await waitForBrowserManager();
		await assert.doesNotReject(async () => {
			const { page } = await browserManager.launchPage();
			pageLaunched = true;
			await browserManager.loadUrlWithRetries(page, "https://google.com");
		});
	});

	it("Should have one less context available after launching a page", async () => {
		await waitForPageLaunch();

		const maxContexts = browserManager.getMaxConcurrentContexts();
		const availableContexts = await browserManager.availableContextSpots();
		assert.strictEqual(availableContexts, maxContexts - 1);
	});


	it("Should not be able to launch pages once the max has been reached", async () => {
		await waitForPageLaunch();

		const availableContexts = await browserManager.availableContextSpots();
		for (let i = 0; i < availableContexts; i++) {
			await browserManager.launchPage();
		}

		assert.rejects(async () => {
			await browserManager.launchPage();
		});
	});

	after(async () => {
		await browserManager.close();
	});
});
