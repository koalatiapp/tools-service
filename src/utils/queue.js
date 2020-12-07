const { isValidTool } = require('./tool.js');

// Singleton
class Queue {
    constructor(pool) {
        if (typeof pool != 'object') {
            throw new Error(`The Queue constructor expects a Postgres Pool object, but received ${typeof pool}`);
        }

        this.pool = pool;
    }

    async add({ url, tool, priority }) {
        if (!priority) {
            priority = 1;
        }

        // Handle requests for multiple tools by calling the add method individually for every requested tool
        if (Array.isArray(tool)) {
            for (const singleTool of tool) {
                this.add({ url, tool: singleTool, priority });
            }
            return;
        }

        // Handle requests for multiple URLs by calling the add method individually for every requested URL
        if (Array.isArray(url)) {
            for (const singleUrl of url) {
                this.add({ url: singleUrl, tool, priority });
            }
            return;
        }

        if (!url || !tool) {
            throw new Error("Invalid request: missing url and/or tool parameter.");
        }

        if (!isValidTool(tool)) {
            throw new Error(`Invalid tool requested. ${tool} is either not a valid Koalati tool, or it is not installed.`);
        }

        /*
         * If an unprocessed request for this exact URL & tool already exists, there is no need to duplicate it.
         * Just skip this request: both requesters will be notified when the existing is processed.
         */
        const existingRequest = await this.getUnprocessedMatchingRequest(url, tool);
        if (existingRequest) {
            // If the new request has a higher priority than the existing one, update the existing request to bump its priority.
            if (priority > existingRequest.priority) {
                this.updateRequestPriority(existingRequest.id, priority);
            }

            return;
        }

        // Insert the request in the database
        const insertResult = await this.pool.query(`
            INSERT INTO requests (url, tool, priority) VALUES ($1, $2, $3)
        `, [url, tool, priority]);
    }

    async getUnprocessedMatchingRequest(url, tool) {
        const res = await this.pool.query(`
            SELECT *
            FROM requests
            WHERE completed_at IS NULL
            AND url = $1
            AND tool = $2
        `, [url, tool]);
        return res.rowCount > 0 ? res.rows[0] : null;
    }

    async updateRequestPriority(requestId, newPriority) {
        await this.pool.query(`
            UPDATE requests
            SET priority = $1
            WHERE id = $2
        `, [newPriority, requestId]);
    }

    async next(currentUrl = null) {
        const data = [];
        const orderBys = [];
        const baseQuery = `
            SELECT *
            FROM requests
            WHERE processed_at IS NULL`;
        let paramName = null;

        // To speed up processing, same-page requests are prioritized as they prevent unnecessary page reloads
        if (currentUrl) {
            paramName = '$' + (orderBys.length + 1);
            orderBys.push(`CASE WHEN url = ${paramName} THEN 0 ELSE 1 END ASC`);
            data.push(currentUrl);
        }

        // @TODO: replace this with the priority algorithm
        orderBys.push('priority DESC');

        orderBys.push('received_at ASC');

        // Build and run the actual query
        const query = baseQuery + (orderBys ? (' ORDER BY ' + orderBys.join(', ')) : '');
        const result = await this.pool.query(query, data);

        return result.rowCount ? result.rows[0] : null;
    }

    async markAsProcessing(requestId) {
        await this.pool.query(`
            UPDATE requests
            SET processed_at = NOW()
            WHERE id = $1
        `, [requestId]);
    }

    async markAsCompleted(requestId, processingTime) {
        await this.pool.query(`
            UPDATE requests
            SET completed_at = NOW(),
            processing_time = $1
            WHERE id = $2
        `, [processingTime, requestId]);
    }

    async pendingCount() {
        const res = await this.pool.query(`
            SELECT COUNT(*) AS "count"
            FROM requests
            WHERE processed_at IS NOT NULL
            AND completed_at IS NULL
        `);
        return res.rows[0].count;
    }

    async nonAssignedCount() {
        const res = await this.pool.query(`
            SELECT COUNT(*) AS "count"
            FROM requests
            WHERE processed_at IS NULL
        `);
        return res.rows[0].count;
    }

    async getAverageProcessingTimes() {
        const timesByTool = {};
        const res = await this.pool.query(`
            SELECT tool, AVG(processing_time) AS time
            FROM requests
            WHERE completed_at IS NOT NULL
            GROUP BY tool;
        `);

        for (const row of res.rows) {
            timesByTool[row.tool] = row.time;
        }

        return timesByTool;
    }
}

let queueInstance = null;
module.exports = (pool) => {
    if (!queueInstance) {
        queueInstance = new Queue(pool);
    }
    return queueInstance;
}
