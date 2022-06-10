const Processor = require("./processor");
const browserManager = require("./browserManager")();

// Singleton
class ProcessorManager {
	constructor() {
		console.log("Proccessor manager initialized");
		this.processors = [];
		this.lookForWorkTimeout = null;
		this.init().catch((error) => {
			console.error(error);
			process.exit(0);
		});
	}

	async init() {
		const queue = require("./queue")();
		const requestCount = await queue.nonAssignedCount();
		const browserContextSpots = await browserManager.availableContextSpots();

		await queue.disconnect();

		if (requestCount > 0 && browserContextSpots > 0) {
			const newProcessorsCount = Math.min(requestCount, browserContextSpots);

			for (let i = 0; i < newProcessorsCount; i++) {
				await new Promise((resolve) => {
					this.create();
					setTimeout(resolve, 500);
				});
			}

			return;
		}

		this.initLookForWorkTimeout();
	}

	create() {
		console.log(`Creating request processor #${this.processors.length}`);

		const processor = new Processor(this);
		this.processors.push(processor);
		return processor;
	}

	checkToHandleNewRequest() {
		this.init();
	}

	kill(processor) {
		const index = this.processors.indexOf(processor);

		if (index != -1) {
			this.processors[index].destroy();
			this.processors.splice(index, 1);
			console.log(`Killed a processor, ${this.processors.length} left.`);

			this.initLookForWorkTimeout();
		}
	}

	/**
	 * Sets a timeout upon which the processor manager will check
	 * if any new requests could be processed.
	 *
	 * This is done to prevent unused processors when there are multiple
	 * instances of the service running at the same time under a load
	 * balancer.
	 */
	initLookForWorkTimeout()
	{
		if (this.lookForWorkTimeout) {
			return;
		}

		this.lookForWorkTimeout = setTimeout(() => {
			this.checkToHandleNewRequest();

			clearTimeout(this.lookForWorkTimeout);
			this.lookForWorkTimeout = null;
		}, 3000);
	}
}

let processorManagerInstance = null;
module.exports = () => {
	if (!processorManagerInstance) {
		processorManagerInstance = new ProcessorManager();
	}
	return processorManagerInstance;
};
