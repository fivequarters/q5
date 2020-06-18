import { Command, ICommand } from '@5qtrs/cli';
import { DeployPortalCommand } from './DeployPortalCommand';
import { RemovePortalCommand } from './RemovePortalCommand';
import { ListPortalCommand } from './ListPortalCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Manage Portal',
  cmd: 'portal',
  summary: 'Manage portal',
  description: 'Deploy and configure Fusebit Portal',
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use',
      defaultText: 'default profile',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class PortalCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await DeployPortalCommand.create());
    subCommands.push(await ListPortalCommand.create());
    subCommands.push(await RemovePortalCommand.create());
    command.subCommands = subCommands;
    return new PortalCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
