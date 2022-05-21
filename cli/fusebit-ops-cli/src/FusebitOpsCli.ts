import { Command, ICommand, ICommandIO, IExecuteInput, ArgType } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import {
  InitCommand,
  SetupCommand,
  ProfileCommand,
  AccountCommand,
  NetworkCommand,
  DomainCommand,
  PortalCommand,
  ImageCommand,
  DeploymentCommand,
  StackCommand,
  SubscriptionCommand,
  AdminCommand,
  VersionCommand,
  ActionCommand,
  RegistryCommand,
  BackupCommand,
  SecurityCommand,
  AssumeCommand,
  MonitoringCommand,
  PluginCommand,
} from './commands';

import * as cliAddonSlack from './services/SlackPluginService';

// ------------------
// Internal Constants
// ------------------

const cli: ICommand = {
  name: 'Fusebit Ops CLI',
  description: 'A command-line tool (CLI) for the managing the operations of the Fusebit platform.',
  cli: 'fuse-ops',
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

// ----------------
// Exported Classes
// ----------------

export class FusebitOpsCli extends Command {
  private commandId: string = '';
  public static async create(io: ICommandIO) {
    if (process.env.FUSEBIT_DEBUG) {
      const AWS = require('aws-sdk');
      AWS.config.logger = console;
    }

    const subCommands: Command[] = [];
    subCommands.push(await InitCommand.create());
    subCommands.push(await SetupCommand.create());
    subCommands.push(await ProfileCommand.create());
    subCommands.push(await AccountCommand.create());
    subCommands.push(await ActionCommand.create());
    subCommands.push(await NetworkCommand.create());
    subCommands.push(await DomainCommand.create());
    subCommands.push(await ImageCommand.create());
    subCommands.push(await DeploymentCommand.create());
    subCommands.push(await StackCommand.create());
    subCommands.push(await SubscriptionCommand.create());
    subCommands.push(await RegistryCommand.create());
    subCommands.push(await AdminCommand.create());
    subCommands.push(await PortalCommand.create());
    subCommands.push(await VersionCommand.create());
    subCommands.push(await BackupCommand.create());
    subCommands.push(await SecurityCommand.create());
    subCommands.push(await AssumeCommand.create());
    subCommands.push(await MonitoringCommand.create());
    subCommands.push(await PluginCommand.create());
    cli.subCommands = subCommands;
    return new FusebitOpsCli(cli);
  }

  private constructor(cli: ICommand) {
    super(cli);
  }

  protected async onSubCommandExecuting(command: Command, input: IExecuteInput): Promise<void> {}

  protected async onSubCommandExecuted(command: Command, input: IExecuteInput, result: number): Promise<void> {
    if (await cliAddonSlack.isSetup()) {
      await cliAddonSlack.endExecution(result.toString());
    }
  }

  protected async onSubCommandError(command: Command, input: IExecuteInput, error: Error) {
    await cliAddonSlack.endExecution('1');
    const verbose = (input.options.verbose as boolean) || process.env.FUSEBIT_DEBUG;
    if (verbose) {
      try {
        input.io.writeRaw(
          Text.create(
            Text.red('[ Unhandled Error ] ').bold(),
            Text.eol(),
            Text.eol(),
            Text.bold('Message'),
            Text.eol(),
            error.message,
            Text.eol(),
            Text.eol(),
            Text.bold('Stack Trace'),
            Text.eol(),
            error.stack || '<No Stack Trace>',
            Text.eol(),
            Text.eol()
          )
        );
      } catch (__) {
        console.log(error);
      }
    }
    return 1;
  }
}
