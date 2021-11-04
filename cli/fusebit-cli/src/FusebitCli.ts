import { Command, ICommand, IExecuteInput, ArgType } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import {
  ClientCommand,
  FunctionCommand,
  InitCommand,
  TokenCommand,
  IssuerCommand,
  ProfileCommand,
  UserCommand,
  VersionCommand,
  NpmCommand,
  ConnectorCommand,
  IntegrationCommand,
  StorageCommand,
  LogCommand,
} from './commands';

// ------------------
// Internal Constants
// ------------------

const cli: ICommand = {
  name: 'Fusebit CLI',
  description: 'A command-line tool (CLI) for the management of Fusebit accounts, users, functions and more.',
  cli: 'fuse',
  docsUrl: 'https://fusebit.io/docs',
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
  subCommands.push(await NpmCommand.create());
  subCommands.push(await ProfileCommand.create());
  subCommands.push(await TokenCommand.create());
  subCommands.push(await UserCommand.create());
  subCommands.push(await ClientCommand.create());
  subCommands.push(await IssuerCommand.create());
  subCommands.push(await VersionCommand.create());
  subCommands.push(await ConnectorCommand.create());
  subCommands.push(await IntegrationCommand.create());
  subCommands.push(await StorageCommand.create());
  subCommands.push(await LogCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class FusebitCli extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    cli.subCommands = await getSubCommands();
    return new FusebitCli(cli);
  }

  protected async onSubCommandExecuting(command: Command, input: IExecuteInput) {
    let current = command;
    let skipInit = current.skipBuiltInProfile;
    while (!skipInit && current.parent) {
      current = current.parent;
      skipInit = current.skipBuiltInProfile;
    }
    if (!skipInit) {
      await InitCommand.createDefaultProfileIfNoneExists(input);
    }
    return super.onSubCommandExecuting(command, input);
  }

  protected async onSubCommandError(command: Command, input: IExecuteInput, error: Error) {
    const verbose = (input.options.verbose as boolean) || process.env.FUSEBIT_DEBUG;
    try {
      input.io.writeRaw(
        Text.create(
          Text.red('[ Unhandled Error ] ').bold(),
          Text.eol(),
          Text.eol(),
          Text.bold('Message'),
          Text.eol(),
          error.message,
          ...(verbose
            ? [
                Text.eol(),
                Text.eol(),
                Text.bold('Stack Trace'),
                Text.eol(),
                error.stack || '<No Stack Trace>',
                Text.eol(),
                Text.eol(),
              ]
            : [])
        )
      );
    } catch (__) {
      console.log(error);
    }
    return 1;
  }
}
