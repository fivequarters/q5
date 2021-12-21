import { Command, ICommand } from '@5qtrs/cli';
import { AddMonitoringCommand } from './AddMonitoringCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Monitoring',
  cmd: 'monitoring',
  summary: 'Manage Fusebit monitoring system',
  description: 'Manage Fusebit Monitoring system (glt stack)',
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

export class MonitoringCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await AddMonitoringCommand.create());
    command.subCommands = subCommands;
    return new MonitoringCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}