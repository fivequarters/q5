#!/usr/bin/env zx

const deployment = argv.d;
const region = argv.r;
const newStackVersion = argv.s;
const params = argv.p === true ? '' : argv.p.split(' ');

$.verbose = true;

if (!deployment || !region || !newStackVersion || params === undefined) {
  console.log('-d deployment -r region -s version -p params');
  process.exit(-1);
}

const currentStacks = JSON.parse(await $`fuse-ops stack ls --deployment ${deployment} --region ${region} -o json`);

console.log(currentStacks);

const newStack = JSON.parse(
  await $`fuse-ops stack add ${deployment} ${newStackVersion} --region ${region} -c f -o json ${params}`
);

await $`fuse-ops stack promote ${deployment} ${newStack.id} --region ${region} -c f`;

// Wait for 30 seconds
console.log('Waiting for 30 seconds to finish promotion...');
await new Promise((resolve) => setTimeout(resolve, 30000));

// Demote all of the other stacks
await Promise.all(
  currentStacks.map((stack) => $`fuse-ops stack demote ${deployment} ${stack.id} --region ${region} -c f`)
);

// Wait for 30 seconds
console.log('Waiting for 30 seconds to finish demotion...');
await new Promise((resolve) => setTimeout(resolve, 30000));

// Delete the old stacks
await Promise.all(currentStacks.map((stack) => $`fuse-ops stack rm ${deployment} ${stack.id} --region ${region} -c f`));
