import { Command, ICommand } from '@5qtrs/cli';
import { AddMonitoringCommand } from './AddMonitoringCommand';
import { GetMonitoringCommand } from './GetMonitoringCommand';
import { ListMonitoringCommand } from './ListMonitoringCommand';
import { StackCommand } from './stack/StackCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Monitoring',
  cmd: 'monitoring',
  summary: 'Manage Fusebit monitoring system',
  // GLT refers to Grafana-Loki-Tempo
  description: 'Manage Fusebit Monitoring system (glt stack)',
};

// ----------------
// Exported Classes
// ----------------

export class MonitoringCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await AddMonitoringCommand.create());
    subCommands.push(await StackCommand.create());
    subCommands.push(await ListMonitoringCommand.create());
    subCommands.push(await GetMonitoringCommand.create());
    command.subCommands = subCommands;
    return new MonitoringCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
