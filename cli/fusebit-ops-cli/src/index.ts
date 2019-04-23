#!/usr/bin/env node

export { FusebitOpsCli } from './FusebitOpsCli';
import { FusebitOpsCli } from './FusebitOpsCli';
import { CommandIO } from '@5qtrs/cli';

async function execute() {
  const args = process.argv.slice(2);
  const io = await CommandIO.create();
  const fusebitOpsCli = await FusebitOpsCli.create(io);
  const exitCode = await fusebitOpsCli.execute(args, io);
  process.exit(exitCode);
}

if (!module.parent) {
  execute();
}
