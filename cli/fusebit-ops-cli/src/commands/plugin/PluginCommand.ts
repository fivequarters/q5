import { Command, ICommand } from '@5qtrs/cli';
import { SlackPluginCommand } from './slack/SlackPluginCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Plugin',
  cmd: 'plugin',
  summary: 'Manage Fusebit Ops Cli Plugins',
  description: 'Manage global plugins ',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class PluginCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await SlackPluginCommand.create());
    command.subCommands = subCommands;
    return new PluginCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
