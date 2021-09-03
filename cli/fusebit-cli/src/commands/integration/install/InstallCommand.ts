import { Command, ICommand } from '@5qtrs/cli';

import { EntityGetCommand } from '../../entity/EntityGetCommand';
import { EntityListCommand } from '../../entity/EntityListCommand';
import { EntityRemoveCommand } from '../../entity/EntityRemoveCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Install',
  cmd: 'install',
  summary: 'Manage installs',
  description: 'Manage installs of an integration.',
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
  ],
};

const entityOptions = {
  singular: 'install',
  capitalSingular: 'Install',
  plural: 'installs',
  capitalPlural: 'Installs',
  parentEntityUrlSegment: 'integration',
  entityUrlSegment: 'instance',
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await EntityListCommand.create(entityOptions));
  subCommands.push(await EntityGetCommand.create(entityOptions));
  subCommands.push(await EntityRemoveCommand.create(entityOptions));
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class InstallCommand extends Command {
  private constructor(cmd: ICommand) {
    super(cmd);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new InstallCommand(command);
  }
}
