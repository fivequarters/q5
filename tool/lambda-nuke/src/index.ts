import AWS from 'aws-sdk';

(async () => {
  const lambdaSdk = new AWS.Lambda({
    region: process.env.REGION,
  });
  do {
    const lambdas = await lambdaSdk.listFunctions().promise();
    if (lambdas.Functions?.length === 0) {
      console.log(`All lambda functions within ${process.env.REGION} have been deleted.`);
      break;
    }
    for (const lambda of lambdas.Functions as AWS.Lambda.FunctionList) {
      console.log(`Deleting function ${lambda.FunctionName}`);
      await lambdaSdk.deleteFunction({ FunctionName: lambda.FunctionName as string }).promise();
    }
  } while (true);
})();
