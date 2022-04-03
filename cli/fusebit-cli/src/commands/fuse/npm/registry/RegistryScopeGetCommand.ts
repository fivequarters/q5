import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { IText, Text } from '@5qtrs/text';

import { ExecuteService } from '../../../../services/ExecuteService';
import { ProfileService } from '../../../../services/ProfileService';

import { getRegistry, IRegistries, printRegistries } from './Registry';

const commandDesc: ICommand = {
  name: 'Get registry scopes',
  cmd: 'get',
  summary: 'Get the allowed registry scopes',
  description: ['Return the configured scopes, both for the application as well as globally.'].join(' '),
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
  ],
};

export class RegistryScopeGetCommand extends Command {
  public static async create() {
    return new RegistryScopeGetCommand(commandDesc);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    const profile = await profileService.getExecutionProfile();

    const registries: IRegistries = await getRegistry(profile);

    await printRegistries(executeService, registries);

    return 0;
  }
}
