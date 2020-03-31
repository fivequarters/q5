"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bigquery_1 = require("@google-cloud/bigquery");
const maxBqInsertBatch = +process.env.MAX_BQ_INSERT_BATCH || 500;
const bqExecutionCounterPeriodSeconds = +process.env.BQ_EXECUTION_COUNTER_PERIOD || 1;
const bqExecutionCounterPeriodMilliseconds = bqExecutionCounterPeriodSeconds * 1000;
const bqMeteringFlushInterval = +process.env.BQ_METERING_FLUSH_INTERVAL || 5000;
let bq;
if (process.env.FUSEBIT_GC_BQ_KEY_BASE64) {
    const gcCredentials = JSON.parse(Buffer.from(process.env.FUSEBIT_GC_BQ_KEY_BASE64, 'base64').toString('utf8'));
    bq = new bigquery_1.BigQuery({
        projectId: gcCredentials.project_id,
        credentials: gcCredentials,
    });
    setInterval(generateExecutionCounters, bqExecutionCounterPeriodMilliseconds).unref();
    setInterval(flushApiMetering, bqMeteringFlushInterval).unref();
}
let executionBuffer;
let executionBufferSize = 0;
let executionCounterTs;
function countExecution(entry) {
    if (!bq)
        return;
    let now = new Date();
    if (executionCounterTs && now.getTime() - executionCounterTs.getTime() > bqExecutionCounterPeriodMilliseconds) {
        generateExecutionCounters();
    }
    if (!executionBuffer) {
        executionBuffer = {};
        executionBufferSize = 0;
        executionCounterTs = new Date();
        executionCounterTs.setUTCMilliseconds(0);
        executionCounterTs.setUTCSeconds(Math.floor(executionCounterTs.getUTCSeconds() / bqExecutionCounterPeriodSeconds) * bqExecutionCounterPeriodSeconds);
    }
    let key = `${entry.subscriptionId}/${entry.boundaryId}/${entry.functionId}`;
    let bqEntry = executionBuffer[key];
    if (bqEntry) {
        bqEntry.count++;
    }
    else {
        executionBuffer[key] = {
            entry,
            count: 1,
        };
        executionBufferSize++;
    }
    if (executionBufferSize >= maxBqInsertBatch) {
        generateExecutionCounters();
    }
}
exports.countExecution = countExecution;
let apiCallBuffer = [];
function meterApiCall(event) {
    if (!event.ts) {
        event.ts = new Date().toISOString();
    }
    if (!event.deploymentId) {
        event.deploymentId = 'localhost';
    }
    apiCallBuffer.push({
        json: event,
        insertId: `${event.deploymentId}/${event.action}/${event.resource}/${event.ts}`,
    });
    if (apiCallBuffer.length >= maxBqInsertBatch) {
        flushApiMetering();
    }
}
exports.meterApiCall = meterApiCall;
function flushApiMetering() {
    if (apiCallBuffer.length === 0)
        return;
    let tmp = apiCallBuffer;
    apiCallBuffer = [];
    //@ts-ignore
    bq.dataset('dwh')
        .table('api_call')
        .insert(tmp, { raw: true })
        .then(async () => {
        console.log(`SUCCESS inserting ${tmp.length} records to dwh.api_call table in Big Query`);
    })
        .catch((e) => {
        console.log(`ERROR inserting ${tmp.length} records to dwh.api_call table in Big Query`, e.message);
        console.log('ERROR[0]', e.errors ? JSON.stringify(e.errors[0], null, 2) : 'NA');
    });
}
function generateExecutionCounters() {
    let now = new Date();
    if (executionBuffer &&
        executionCounterTs &&
        now.getTime() - executionCounterTs.getTime() > bqExecutionCounterPeriodMilliseconds) {
        let bqInsertPayload = [];
        let ts = executionCounterTs.toISOString();
        for (var k in executionBuffer) {
            let bqEntry = executionBuffer[k];
            bqInsertPayload.push({
                json: {
                    ts,
                    deploymentId: bqEntry.entry.deploymentId,
                    subscriptionId: bqEntry.entry.subscriptionId,
                    boundaryId: bqEntry.entry.boundaryId,
                    functionId: bqEntry.entry.functionId,
                    count: bqEntry.count,
                },
                insertId: `${k}/${ts}`,
            });
        }
        executionBuffer = undefined;
        //@ts-ignore
        bq.dataset('dwh')
            .table('execution')
            .insert(bqInsertPayload, { raw: true })
            .then(async () => {
            console.log(`SUCCESS inserting ${bqInsertPayload.length} records to dwh.execution table in Big Query`);
        })
            .catch((e) => {
            console.log(`ERROR inserting ${bqInsertPayload.length} records to dwh.execution table in Big Query`, e.message);
            console.log('ERROR[0]', e.errors ? JSON.stringify(e.errors[0], null, 2) : 'NA');
        });
    }
}
//# sourceMappingURL=index.js.map