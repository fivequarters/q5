#!/usr/bin/env node

export { FusebitCli } from './FusebitCli';
import { CommandIO } from '@5qtrs/cli';
import { FusebitCli } from './FusebitCli';

// This turns the default profile feature globally for all CLI commands
process.env.FUSEBIT_FEATURE_DEFAULT_PROFILE = '1';

async function execute() {
  //@ts-ignore
  const major = +process.versions.node.match(/^(\d+)\./)[1];
  if (major < 10) {
    console.error(`The fuse-ops CLI requires Node.js 10.x or later. You are running ${process.version}.`);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const io = await CommandIO.create();
  const cli = await FusebitCli.create();
  const exitCode = await cli.execute(args, io);
  process.exit(exitCode);
}

if (!module.parent) {
  execute();
}
