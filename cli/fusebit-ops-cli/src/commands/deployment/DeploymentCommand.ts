import { Command, ICommand } from '@5qtrs/cli';
import { AddDeploymentCommand } from './AddDeploymentCommand';
import { ListDeploymentCommand } from './ListDeploymentCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Deployment',
  cmd: 'deployment',
  summary: 'Manage deployments',
  description: 'Add, update and list deployments',
};

// ----------------
// Exported Classes
// ----------------

export class DeploymentCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await AddDeploymentCommand.create());
    subCommands.push(await ListDeploymentCommand.create());
    command.subCommands = subCommands;
    return new DeploymentCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
