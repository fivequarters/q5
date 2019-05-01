const { loadTest } = require('loadtest');

/**
 * @param ctx {FlexdContext}
 * @param cb {FlexdCallback}
 */
module.exports = (ctx, cb) => {
  let options = ctx.method === 'POST' ? ctx.body : ctx.query;

  if (!options.url) {
    return cb(null, { body: { status: 400, message: 'At least `url` parameter must be provided.' }, status: 400 });
  }

  if (options.cluster) {
    // Delegate perf test to a cluster of worker lambdas and aggregate results
    console.log('RUNNING CLUSTERED PERFORMANCE TEST', options);
    const Superagent = require('superagent');
    let cluster = +options.cluster;
    delete options.cluster;
    options.worker = 1;
    let url = `https://${ctx.headers.host}/v1/run/${ctx.subscriptionId}/${ctx.boundaryId}/${ctx.functionId}`;
    let workers = [];
    while (workers.length < cluster) {
      if (ctx.method === 'POST') {
        workers.push(Superagent.post(url).send(options));
      } else {
        workers.push(Superagent.get(url).query(options));
      }
    }
    Promise.all(workers).then(r => {
      delete options.worker;
      options.cluster = cluster;
      let result = {
        individualResults: r.map(x => x.body),
        options,
        aggregateResults: {
          rps: 0,
          totalRequests: 0,
          totalErrors: 0,
          errorCodes: {},
          maxLatencyMs: 0,
          minLatencyMs: 999999,
        },
      };
      result.individualResults.forEach(x => {
        result.aggregateResults.rps += x.rps;
        result.aggregateResults.totalRequests += x.totalRequests;
        result.aggregateResults.totalErrors += x.totalErrors;
        result.aggregateResults.maxLatencyMs = Math.max(result.aggregateResults.maxLatencyMs, x.maxLatencyMs);
        result.aggregateResults.minLatencyMs = Math.min(result.aggregateResults.minLatencyMs, x.minLatencyMs);
        for (var c in x.errorCodes) {
          result.aggregateResults.errorCodes[c] = (result.aggregateResults.errorCodes[c] || 0) + x.errorCodes[c];
        }
      });
      cb(null, { body: result });
    });
  } else {
    // Run perf test
    options.worker
      ? console.log('STARTING PERFORMANCE WORKER')
      : console.log('RUNNING ONE-NODE PERFORMANCE TEST', options);
    loadTest(options, (e, r) => {
      options.worker
        ? console.log('FINISHED PERFORMANCE WORKER')
        : console.log('FINISHED ONE-NODE PERFORMANCE TEST', r);
      return e ? cb(e) : cb(null, { body: r });
    });
  }
};
