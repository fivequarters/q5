#!/usr/bin/env node

const PERF_FUNC_URL = process.env.PERF_FUNC_URL;
if (!PERF_FUNC_URL) {
  throw new Error('PERF_FUNC_URL must specify the URL of the fusebit function created with `yarn deploy perf`');
}

process.argv.shift();
process.argv.shift();

if (process.argv.length === 0) {
  console.log('Usage: yarn test perf {fusebit-function-url} [options]');
  console.log();
  console.log('Options:');
  console.log('  --cluster N       : create a cluster of N Lamda functions acting as performance clients. Default 10.');
  console.log('  --concurrency N   : how many concurrent requests each performance client sends. Default 10.');
  console.log('  --maxSeconds N    : Duration of the test. Default 10.');
  console.log('  --maxRequests N   : Maximum number of requests each performance client sends. Default unlimited.');
  console.log();
  console.log('Full list of options: https://www.npmjs.com/package/loadtest#options');
  process.exit(1);
}

let options = {
  url: process.argv.shift(),
};
if (!options.url.match(/^http/i)) {
  throw new Error('The URL of the function to test must start with `http` or `https`');
}

while (process.argv.length > 0) {
  let key = process.argv.shift();
  let value = process.argv.shift();
  let match = key.match(/^--(.+)$/);
  if (!match) {
    throw new Error(`The option ${key} is malformed`);
  }
  if (value === undefined) {
    throw new Error(`The value of the ${key} options is not specified`);
  }
  options[match[1]] = value;
}

options.cluster = options.cluster || 10;
options.concurrency = options.concurrency || 10;
options.maxSeconds = options.maxSeconds || 10;

console.log('Running perf test with options', options);

const Superagent = require('superagent');

Superagent.post(PERF_FUNC_URL)
  .send(options)
  .then(r => {
    console.log(JSON.stringify(r.body, null, 2));
  });
