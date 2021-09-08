#!/usr/bin/env node
import fs from 'fs';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const processInputAndTriggerNotification = async () => {
  const argv = await yargs(hideBin(process.argv)).argv;

  if (!argv || !argv.path || typeof argv.path !== 'string') {
    throw Error('Invalid input path.');
  }
  const content = await fs.promises.readFile(argv.path);
  return JSON.parse(content.toString('utf8'));
};

processInputAndTriggerNotification().then((pl) => {
  console.log(pl);
});
