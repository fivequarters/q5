import { Command, ICommand } from '@5qtrs/cli';
import { EnableDeploymentHealthCommand } from './EnableDeploymentHealthCommand';
import { DisableDeploymentHealthCommand } from './DisableDeploymentHealthCommand';
// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Enable/Disable Deployment Health Checks',
  cmd: 'health',
  summary: 'Manage Deployment Health Checks',
  description: 'Enable/Disable the deployment healthcheck against a specific deployment.',
};

// ----------------
// Exported Classes
// ----------------

export class DeploymentHealthCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await EnableDeploymentHealthCommand.create());
    subCommands.push(await DisableDeploymentHealthCommand.create());
    command.subCommands = subCommands;
    return new DeploymentHealthCommand(command);
  }

  private constructor(cmd: ICommand) {
    super(cmd);
  }
}
