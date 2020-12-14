const Processor = require('./processor');
const queue = require('./queue')();
const browserManager = require('./browserManager')();

// Singleton
class ProcessorManager {
    constructor() {
        console.log('Proccessor manager initialized');
        this.processors = [];
        this.init();
    }

    async init() {
        const requestCount = await queue.nonAssignedCount();
        const browserContextSpots = await browserManager.availableContextSpots();

        if (requestCount > 0 && browserContextSpots > 0) {
            const newProcessorsCount = Math.min(requestCount, browserContextSpots);

            for (let i = 0; i < newProcessorsCount; i++) {
                await new Promise((resolve) => {
                    this.create();
                    setTimeout(resolve, 500);
                });
            }
        }
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
            this.processors[index].destroy()
            this.processors.splice(index, 1);
        }
    }
}

let processorManagerInstance = null;
module.exports = () => {
    if (!processorManagerInstance) {
        processorManagerInstance = new ProcessorManager();
    }
    return processorManagerInstance;
}
