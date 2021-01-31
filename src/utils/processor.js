const puppeteer = require("puppeteer");
const queue = require("./queue")();
const browserManager = require("./browserManager")();
const Notify = require("./notify");
const validator = new (require("@koalati/results-validator"))();

module.exports = class Processor {
	constructor(processorManager = null) {
		const instance = this;

		this.ready = false;
		this.page = null;
		this.browserContext= null;
		this.previousRequest = null;
		this.activeRequest = null;
		this.consoleMessages = browserManager.getConsoleMessageCollectionTemplate();
		this.manager = processorManager;

		browserManager.launchPage().then(({ page, context }) => {
			instance.init(page, context);
		});
	}

	init(page, context) {
		if (this.ready) {
			return;
		}

		this.ready = true;
		this.page = page;
		this.browserContext = context;
		browserManager.initConsoleMessageCollection(page, this.consoleMessages);
		this.processNextRequest();
	}

	isBusy() {
		return !this.isReady || !!this.activeRequest;
	}

	async processNextRequest() {
		/*
         * Get the next testing request.
         * If none is pending, destroy the processor.
         * Another one will be created when it is needed.
         */
		const request = await queue.next(this.previousRequest ? this.previousRequest.url : null);
		if (!request) {
			this.selfDestroy();
			return;
		}

		this.activeRequest = request;

		// Mark the request as being processed to prevent other processors from processing it
		await queue.markAsProcessing(request.id);
		const processingStartTime = Date.now();
		console.log(`Request ${request.id} is now being processed...`);

		try {
			/**
             * @TODO: Check if the previous request's tool is destructive, and reload the page if it is.
             * The page should also be reloaded if the previous request resulted in an error, as the cleanup process might not have been executed.
             */
			if (!this.previousRequest || this.previousRequest.url != request.url) {
				// Reset console messages
				this.consoleMessages = browserManager.getConsoleMessageCollectionTemplate();

				// Load the request's page
				await browserManager.loadUrlWithRetries(this.page, request.url);
			}
		} catch (error) {
			return this.failRequest(error.message);
		}

		// Prepare the data that will be provided to the tool
		const availableData = {
			page: this.page,
			consoleMessages: this.consoleMessages,
			devices: puppeteer.devices
		};

		// Run the tool
		let jsonResults = null;
		try {
			const toolClass = require(request.tool);
			const toolInstance = new toolClass(availableData);
			await toolInstance.run();
			const validationErrors = validator.checkResults(toolInstance.results);

			if (validationErrors.length) {
				return this.failRequest("The tool's results were invalid. This error will be reported to the tool's developer automatically.", validationErrors);
			}

			jsonResults = JSON.stringify(toolInstance.results);
			await toolInstance.cleanup();
		} catch (error) {
			if (!jsonResults) {
				return this.failRequest("An error has occured while running the tool on your page. This error will be reported to the tool's developer automatically.", error);
			} else {
				/*
                 * If the results are present, it means the error occured during the tool's cleanup() method.
                 * This isn't worth throwing an error to the end-user, but the developer should be notified.
                 */
				Notify.developerError(request, error.message, error);
			}
		}

		return this.completeRequest(jsonResults, Date.now() - processingStartTime);
	}

	failRequest(errorMessage, errorData = null) {
		const request = Object.assign({}, this.activeRequest);

		this.previousRequest = request;
		this.activeRequest = null;

		queue.markAsCompleted(request.id, null);
		Notify.requestError(request, errorMessage);
		Notify.developerError(request, errorMessage, errorData);

		console.error(`Request ${request.id} failed: ${JSON.stringify(errorData)}\n`);

		this.processNextRequest();
	}

	completeRequest(jsonResults, processingTime) {
		const request = Object.assign({}, this.activeRequest);

		this.previousRequest = request;
		this.activeRequest = null;

		queue.markAsCompleted(request.id, processingTime);
		Notify.requestSuccess(request, jsonResults, processingTime);

		console.log(`Request ${request.id} completed successfully (in ${processingTime} ms)\n`);

		this.processNextRequest();
	}

	selfDestroy() {
		if (this.manager) {
			this.manager.kill(this);
		}
	}

	destroy() {
		if (this.browserContext) {
			this.browserContext.close();
		}
	}
};
