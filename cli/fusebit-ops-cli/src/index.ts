#!/usr/bin/env node

export { FusebitOpsCli } from './FusebitOpsCli';
import { FusebitOpsCli } from './FusebitOpsCli';
import { CommandIO } from '@5qtrs/cli';

import { getVersion } from './services/VersionService';

async function execute() {
  //@ts-ignore
  const major = +process.versions.node.match(/^(\d+)\./)[1];
  if (major < 10) {
    console.error(`The fuse-ops CLI requires Node.js 10.x or later. You are running ${process.version}.`);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const io = await CommandIO.create();
  const fusebitOpsCli = await FusebitOpsCli.create(io);

  // Store the version in the environment so it can be recorded in a variety of places.
  process.env.FUSEOPS_VERSION = await getVersion();

  const exitCode = await fusebitOpsCli.execute(args, io);

  // Force stdout to flush
  process.stdout.write('\n');

  process.exit(exitCode);
}

if (!module.parent) {
  execute();
}
