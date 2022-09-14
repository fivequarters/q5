#!/usr/bin/env zx

// Example:
//   ./shell.mjs --profile=dev.dev "SELECT * FROM entity LIMIT 1"
//
$.verbose = false;

const profile = await $`cat env.${argv.profile}`;
const params = { AWS_PROFILE: '', REGION: '', SECRET_ARN: '', DATABASE_ARN: '', DATABASE_NAME: 'fusebit' };

profile
  .toString()
  .split('\n')
  .forEach((line) => {
    const [name, val] = line.split('=');
    name && (params[name] = val);
  });

const execParams = [
  `--profile=${params.AWS_PROFILE}`,
  `--region=${params.REGION}`,
  `rds-data`,
  `execute-statement`,
  `--include-result-metadata`,
  `--database=${params.DATABASE_NAME}`,
  `--secret-arn=${params.SECRET_ARN}`,
  `--resource-arn=${params.DATABASE_ARN}`,
  `--sql=${argv._[1]}`,
];

const result = JSON.parse((await $`aws ${execParams}`).toString());

const cols = (result.records || []).map((record) =>
  record.reduce((prev, cur, idx) => {
    prev[result.columnMetadata[idx].name] =
      result.columnMetadata[idx].typeName === 'jsonb' ? JSON.parse(Object.values(cur)[0]) : Object.values(cur)[0];
    return prev;
  }, {})
);

console.log(JSON.stringify(cols, null, 2));
