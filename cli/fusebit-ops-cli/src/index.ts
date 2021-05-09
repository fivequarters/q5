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
  console.log('FUSE_OPS_VERSION: ' + process.env.FUSEOPS_VERSION);

  const exitCode = await fusebitOpsCli.execute(args, io);
  process.exit(exitCode);
}

if (!module.parent) {
  execute();
}
