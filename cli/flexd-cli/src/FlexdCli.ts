import { Command, ICommand, ArgType } from '@5qtrs/cli';
import {
  ClientCommand,
  FunctionCommand,
  InitCommand,
  TokenCommand,
  IssuerCommand,
  ProfileCommand,
  UserCommand,
  VersionCommand,
} from './commands';

// ------------------
// Internal Constants
// ------------------

const cli: ICommand = {
  name: 'Flexd CLI',
  description: 'A command-line tool (CLI) for the management of Flexd accounts, users, functions and more.',
  cli: 'flx',
  docsUrl: 'https://fivequarters.github.io/docs',
  options: [
    {
      name: 'verbose',
      aliases: ['v'],
      description: 'Provide error details on command execution failure',
      type: ArgType.boolean,
      default: 'false',
    },
  ],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands: Command[] = [];
  subCommands.push(await InitCommand.create());
  subCommands.push(await FunctionCommand.create());
  subCommands.push(await ProfileCommand.create());
  subCommands.push(await TokenCommand.create());
  subCommands.push(await UserCommand.create());
  subCommands.push(await ClientCommand.create());
  subCommands.push(await IssuerCommand.create());
  subCommands.push(await VersionCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class FlexdCli extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    cli.subCommands = await getSubCommands();
    return new FlexdCli(cli);
  }
}
