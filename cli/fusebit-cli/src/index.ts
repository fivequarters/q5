#!/usr/bin/env node

export { FlexdCli } from './FlexdCli';
import { CommandIO } from '@5qtrs/cli';
import { FlexdCli } from './FlexdCli';

async function execute() {
  const args = process.argv.slice(2);
  const io = await CommandIO.create();
  const flexdCli = await FlexdCli.create();
  const exitCode = await flexdCli.execute(args, io);
  process.exit(exitCode);
}

if (!module.parent) {
  execute();
}
