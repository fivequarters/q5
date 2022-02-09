export async function waitForFunction(lambda: any, name: string, maxWait: number = 60000): Promise<Error | undefined> {
  const waitStart = Date.now();
  const quitAfter = waitStart + maxWait;

  // Arbitrarily chosen poll delay interval
  const pollDelay = 5000;
  const fastPollDelay = 100;

  // Fast-poll during the initial period to avoid unnecessary latency if the function fast converges
  const fastPollInterval = waitStart + pollDelay;

  let d = await lambda.getFunction({ FunctionName: name }).promise();

  while (d.Configuration?.State === 'Pending' || d.Configuration?.LastUpdateStatus === 'InProgress') {
    if (Date.now() > fastPollInterval) {
      // Delay before trying again after the first 5 seconds
      await new Promise((resolve) => setTimeout(resolve, pollDelay));
    } else {
      // Short delay before trying again during the fast poll interval.
      await new Promise((resolve) => setTimeout(resolve, fastPollDelay));
    }

    // Don't try forever
    if (Date.now() > quitAfter) {
      return new Error(`Unable to resolve function: ${name}`);
    }

    d = await lambda.getFunction({ FunctionName: name }).promise();
  }
  return;
}
