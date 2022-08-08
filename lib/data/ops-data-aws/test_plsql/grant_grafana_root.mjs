#!/usr/bin/env zx
// $.verbose = false;

const profile = 'monitoring.stage.us-west-2.prod';
const accountId = 'acc-dc2c354610d84060';

const result = JSON.parse(
  (await $`./shell.mjs --profile=${profile} "SELECT * FROM org WHERE name = '${accountId}'"`).toString()
);

if (result.length != 1) {
  console.log(`Not only one result found: ${result.length}...?`);
  process.exit(1);
}

const orgId = result[0].id;

console.log(`Promoting org: ${orgId}`);
console.log(JSON.stringify(result));

console.log(await $`./shell.mjs --profile=${profile} "UPDATE org_user SET role = 'Admin' WHERE org_id = ${orgId}"`);
