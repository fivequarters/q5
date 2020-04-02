#!/usr/bin/env node

import { NewlineLimitedStream } from '@5qtrs/stream';
import { Project } from '@5qtrs/workspace';
import DeleteCommand from './DeleteCommand';
import IncrementCommand from './IncrementCommand';
import MoveCommand from './MoveCommand';
import NewCommand from './NewCommand';
import PortsCommand from './PortsCommand';
import RenameCommand from './RenameCommand';
import RequireCommand from './RequireCommand';
import YarnCommand from './YarnCommand';
import PackageCommand from './PackageCommand';

const commands = [
  new YarnCommand(),
  new NewCommand(),
  new MoveCommand(),
  new DeleteCommand(),
  new RenameCommand(),
  new IncrementCommand(),
  new PortsCommand(),
  new RequireCommand(),
  new PackageCommand(),
];

const output = new NewlineLimitedStream(2);
output.pipe(process.stdout);

function getCommand(commandName: string) {
  for (const command of commands) {
    if (command.Name.toLowerCase() === commandName.toLowerCase()) {
      return command;
    }
  }
  return null;
}

function writeError(message: string): number {
  output.write(`\n\u001b[31mError:\u001b[39m ${message}\n\n`);
  process.exit(1);
  return 1;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const commandName = args.shift() || '';
  let rc: number = 0;

  if (!commandName) {
    return writeError('A command is required');
  }

  const command = getCommand(commandName);
  if (!command) {
    return writeError(`No such command: ${commandName}`);
  }

  const project = await Project.FromDiscoveredRootPath();

  try {
    await command.Handler(args, project, output);
  } catch (error) {
    return writeError(error.message);
  }

  output.write('\n\n');

  return rc;
}

(async () => process.exit(await main()))();
