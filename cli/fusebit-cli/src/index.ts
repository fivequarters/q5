#!/usr/bin/env node

import mode from './mode';

// Is this an `everyauth` command or a `fuse` command? Default to everyauth for now.
global.COMMAND_MODE = process.env.FUSEBIT_COMMAND_MODE || mode;

import { CommandIO } from '@5qtrs/cli';
const { Cli } = require(`./${COMMAND_MODE}Cli`);

async function execute() {
  //@ts-ignore
  const major = +process.versions.node.match(/^(\d+)\./)[1];
  if (major < 10) {
    console.error(`The ${COMMAND_MODE} CLI requires Node.js 10.x or later. You are running ${process.version}.`);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const io = await CommandIO.create({ outputWidth: 120 });
  const cli = await Cli.create();
  const exitCode = await cli.execute(args, io);

  // Force stdout to flush
  process.stdout.write('\n');

  process.exit(exitCode);
}

if (!module.parent) {
  execute();
}
