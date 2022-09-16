import { Command, ICommand } from '@5qtrs/cli';
import { EnableSlackPluginCommand } from './EnableSlackPluginCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Slack',
  cmd: 'slack',
  summary: 'Manage the Slack Plugin for Fusebit Ops Cli',
  description: 'Manage the configuration of the slack plugin for the Fusebit Ops Cli.',
};

// ----------------
// Exported Classes
// ----------------

export class SlackPluginCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await EnableSlackPluginCommand.create());
    command.subCommands = subCommands;
    return new SlackPluginCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
