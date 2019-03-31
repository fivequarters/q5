import { Command, ICommand } from '@5qtrs/cli';
import { FlexdOpsCore } from '@5qtrs/flexd-ops-core';
import { AddDeploymentCommand } from './AddDeploymentCommand';
import { RootDeploymentCommand } from './RootDeploymentCommand';

// ----------------
// Exported Classes
// ----------------

export class DeploymentCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    const subCommands = [];
    subCommands.push(await AddDeploymentCommand.create(core));
    subCommands.push(await RootDeploymentCommand.create(core));

    const command = {
      name: 'Deployment',
      cmd: 'deployment',
      summary: 'Manage deployments',
      description: 'Add, update and list deployments',
      subCommands,
    };
    return new DeploymentCommand(command, core);
  }

  private constructor(command: ICommand, core: FlexdOpsCore) {
    super(command);
    this.core = core;
  }
}
