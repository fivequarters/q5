import { Command, ICommand } from '@5qtrs/cli';

import { EntityGetCommand } from '../../../common/entity/EntityGetCommand';
import { EntityListCommand } from '../../../common/entity/EntityListCommand';
import { EntityRemoveCommand } from '../../../common/entity/EntityRemoveCommand';

import { FusebitTenantTag } from '../../../../services/EntityService';

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
  parentName: 'integration',
  parentEntityUrlSegment: 'integration',
  tenantName: 'Tenant',
  tenantTag: FusebitTenantTag,
  entityUrlSegment: 'install',
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
