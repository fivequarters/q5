import { Command, ICommand, ArgType } from '@5qtrs/cli';
import {
  BoundaryCommand,
  ClientCommand,
  FunctionCommand,
  InitCommand,
  IssuerCommand,
  ProfileCommand,
  UserCommand,
  VersionCommand,
} from './commands';

// ----------------
// Exported Classes
// ----------------

export class FlexdCli extends Command {
  public static async create() {
    const subCommands: Command[] = [];
    subCommands.push(await InitCommand.create());
    subCommands.push(await FunctionCommand.create());
    subCommands.push(await ProfileCommand.create());
    subCommands.push(await UserCommand.create());
    subCommands.push(await ClientCommand.create());
    subCommands.push(await IssuerCommand.create());
    subCommands.push(await BoundaryCommand.create());
    subCommands.push(await VersionCommand.create());

    const cli = {
      name: 'Flexd CLI',
      description: 'A command-line tool (CLI) for the management of Flexd accounts, users, functions and more.',
      cli: 'flx',
      docsUrl: 'https://fivequarters.github.io/docs',
      subCommands,
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

    return new FlexdCli(cli);
  }
  private constructor(cli: ICommand) {
    super(cli);
  }
}
