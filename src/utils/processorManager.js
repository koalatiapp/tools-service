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

        if (requestCount > 0) {
            this.create();
            // @TODO: Update the processorManager to allow multiple pages/contexts/processors at once.
            /*
            for (let i = 0; i < requestCount; i++) {
                const isBrowserMaxedOut = await browserManager.hasReachedMaxLoad();
                const processor =
            }
            */
        }
    }

    create() {
        const processor = new Processor(this);
        this.processors.push(processor);
        return processor;
    }

    checkToHandleNewRequest() {
        this.create();
    }

    kill(processor) {
        const index = this.processors.indexOf(processor);
        if (index) {
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
