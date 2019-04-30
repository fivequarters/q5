import { Command, ICommand } from '@5qtrs/cli';
import { FusebitOpsCore } from '@5qtrs/fusebit-ops-core';
import { AddDeploymentCommand } from './AddDeploymentCommand';

// ----------------
// Exported Classes
// ----------------

export class DeploymentCommand extends Command {
  private core: FusebitOpsCore;

  public static async create(core: FusebitOpsCore) {
    const subCommands = [];
    subCommands.push(await AddDeploymentCommand.create(core));

    const command = {
      name: 'Deployment',
      cmd: 'deployment',
      summary: 'Manage deployments',
      description: 'Add, update and list deployments',
      subCommands,
    };
    return new DeploymentCommand(command, core);
  }

  private constructor(command: ICommand, core: FusebitOpsCore) {
    super(command);
    this.core = core;
  }
}
