## Overview

The simple performance test framework uses a cluster of Fusebit functions as test clients for load testing of another Fusebit function, possibly in another deployment.

Overall flow:

1. Create a Fusebit function that implements the test framework with `yarn deploy perf`.
2. Run performance test against a specific Fusebit function with `yarn test perf {fusebit-function-url} [options]`. You can run it any number of times, even in parallel, against different target functions. Run `yarn test perf` without parameters for help.
3. Clean up the test framework with `yarn clean perf`.

**NOTE** The `{fusebit-function-url}` is a function that must exist at the time the perf test runs. This must be created separately, e.g. using `fuse function edit`.

## Results

The `yarn test perf ...` command generates a large JSON object as a result. The object contains the `aggregateResults` property that reports the overall RPS, min and max latency, and any errors that occurred. The object also contains `individualResults` array with perforomance results generated from individual instances of performance framework Fusebit functions in the cluster.

E.g.

```json
{
  "aggregateResults": {
    "rps": 539,
    "totalRequests": 5446,
    "totalErrors": 0,
    "errorCodes": {},
    "maxLatencyMs": 1300,
    "minLatencyMs": 232
  }
}
```
