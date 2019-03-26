#!/usr/bin/env node

export { FlexdOpsCli } from './FlexdOpsCli';
import { FlexdOpsCli } from './FlexdOpsCli';
import { CommandIO } from '@5qtrs/cli';

async function execute() {
  const args = process.argv.slice(2);
  const io = await CommandIO.create();
  const flexdOpsCli = await FlexdOpsCli.create(io);
  const exitCode = await flexdOpsCli.execute(args, io);
  process.exit(exitCode);
}

if (!module.parent) {
  execute();
}
