import { BigQuery } from '@google-cloud/bigquery';

const maxBqInsertBatch = +(process.env.MAX_BQ_INSERT_BATCH as string) || 500;
const bqExecutionCounterPeriodSeconds = +(process.env.BQ_EXECUTION_COUNTER_PERIOD as string) || 1;
const bqExecutionCounterPeriodMilliseconds = bqExecutionCounterPeriodSeconds * 1000;
const bqMeteringFlushInterval = +(process.env.BQ_METERING_FLUSH_INTERVAL as string) || 5000;
let bq: BigQuery;

if (process.env.FUSEBIT_GC_BQ_KEY_BASE64) {
  const gcCredentials = JSON.parse(Buffer.from(process.env.FUSEBIT_GC_BQ_KEY_BASE64, 'base64').toString('utf8'));
  bq = new BigQuery({
    projectId: gcCredentials.project_id,
    credentials: gcCredentials,
  });
  setInterval(generateExecutionCounters, bqExecutionCounterPeriodMilliseconds).unref();
  setInterval(flushApiMetering, bqMeteringFlushInterval).unref();
}

export interface IExecutionEntry {
  deploymentId: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
}

interface IBqExecutionEntry {
  entry: IExecutionEntry;
  count: number;
}

let executionBuffer: { [property: string]: IBqExecutionEntry } | undefined;
let executionBufferSize: number = 0;
let executionCounterTs: Date;

export function countExecution(entry: IExecutionEntry) {
  if (!bq) return;
  let now = new Date();
  if (executionCounterTs && now.getTime() - executionCounterTs.getTime() > bqExecutionCounterPeriodMilliseconds) {
    generateExecutionCounters();
  }
  if (!executionBuffer) {
    executionBuffer = {};
    executionBufferSize = 0;
    executionCounterTs = new Date();
    executionCounterTs.setUTCMilliseconds(0);
    executionCounterTs.setUTCSeconds(
      Math.floor(executionCounterTs.getUTCSeconds() / bqExecutionCounterPeriodSeconds) * bqExecutionCounterPeriodSeconds
    );
  }
  let key = `${entry.subscriptionId}/${entry.boundaryId}/${entry.functionId}`;
  let bqEntry = executionBuffer[key];
  if (bqEntry) {
    bqEntry.count++;
  } else {
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

export interface IApiCallEntry {
  ts?: string;
  deploymentId?: string;
  accountId: string;
  action: string;
  resource: string;
  issuer?: string;
  subject?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
  agentId?: string;
  issuerId?: string;
  userAgent?: string;
}

let apiCallBuffer: any[] = [];

export function meterApiCall(event: IApiCallEntry) {
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

function flushApiMetering() {
  if (apiCallBuffer.length === 0) return;
  let tmp = apiCallBuffer;
  apiCallBuffer = [];
  bq.dataset('dwh')
    .table('api_call')
    //@ts-ignore
    .insert(tmp, { raw: true })
    .then(async () => {
      console.log(`SUCCESS inserting ${tmp.length} records to dwh.api_call table in Big Query`);
    })
    .catch((e: any) => {
      console.log(`ERROR inserting ${tmp.length} records to dwh.api_call table in Big Query`, e.message);
      console.log('ERROR[0]', e.errors ? JSON.stringify(e.errors[0], null, 2) : 'NA');
    });
}

function generateExecutionCounters() {
  let now = new Date();
  if (
    executionBuffer &&
    executionCounterTs &&
    now.getTime() - executionCounterTs.getTime() > bqExecutionCounterPeriodMilliseconds
  ) {
    let bqInsertPayload: any[] = [];
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
    bq.dataset('dwh')
      .table('execution')
      //@ts-ignore
      .insert(bqInsertPayload, { raw: true })
      .then(async () => {
        console.log(`SUCCESS inserting ${bqInsertPayload.length} records to dwh.execution table in Big Query`);
      })
      .catch((e: any) => {
        console.log(`ERROR inserting ${bqInsertPayload.length} records to dwh.execution table in Big Query`, e.message);
        console.log('ERROR[0]', e.errors ? JSON.stringify(e.errors[0], null, 2) : 'NA');
      });
  }
}
