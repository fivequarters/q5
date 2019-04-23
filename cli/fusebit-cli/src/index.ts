#!/usr/bin/env node

export { FusebitCli } from './FusebitCli';
import { CommandIO } from '@5qtrs/cli';
import { FusebitCli } from './FusebitCli';

async function execute() {
  const args = process.argv.slice(2);
  const io = await CommandIO.create();
  const cli = await FusebitCli.create();
  const exitCode = await cli.execute(args, io);
  process.exit(exitCode);
}

if (!module.parent) {
  execute();
}
