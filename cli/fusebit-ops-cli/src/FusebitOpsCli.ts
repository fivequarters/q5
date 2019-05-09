import { Command, ICommand, ICommandIO } from '@5qtrs/cli';
import {
  InitCommand,
  SetupCommand,
  ProfileCommand,
  AccountCommand,
  NetworkCommand,
  DomainCommand,
  ImageCommand,
  DeploymentCommand,
  StackCommand,
} from './commands';

// ------------------
// Internal Constants
// ------------------

const cli: ICommand = {
  name: 'Fusebit Ops CLI',
  description: 'A command-line tool (CLI) for the managing the operations of the Fusebit platform.',
  cli: 'fuse-ops',
};

// ----------------
// Exported Classes
// ----------------

export class FusebitOpsCli extends Command {
  public static async create(io: ICommandIO) {
    const subCommands: Command[] = [];
    subCommands.push(await InitCommand.create());
    subCommands.push(await SetupCommand.create());
    subCommands.push(await ProfileCommand.create());
    subCommands.push(await AccountCommand.create());
    subCommands.push(await NetworkCommand.create());
    subCommands.push(await DomainCommand.create());
    subCommands.push(await ImageCommand.create());
    subCommands.push(await DeploymentCommand.create());
    subCommands.push(await StackCommand.create());
    cli.subCommands = subCommands;
    return new FusebitOpsCli(cli);
  }

  private constructor(cli: ICommand) {
    super(cli);
  }
}
