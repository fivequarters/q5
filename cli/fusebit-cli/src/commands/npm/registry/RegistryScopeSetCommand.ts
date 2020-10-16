import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { IText, Text } from '@5qtrs/text';

import { ExecuteService } from '../../../services/ExecuteService';
import { ProfileService } from '../../../services/ProfileService';

import { getRegistry, IRegistries, printRegistries, putRegistry } from './Registry';

const commandDesc: ICommand = {
  name: 'Set registry scopes',
  cmd: 'set',
  summary: 'Set the allowed registry scopes',
  description: [
    'Set the allowed registry scopes as a series of comma separated scopes.',
    'For example, "@scope1,@scope2,@internal,@packages"',
  ].join(' '),
  arguments: [
    {
      name: 'scopes',
      description: 'The scopes to set the registry to support.',
      required: true,
    },
  ],
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
  ],
};

export class RegistryScopeSetCommand extends Command {
  public static async create() {
    return new RegistryScopeSetCommand(commandDesc);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    const profile = await profileService.getExecutionProfile();

    const scopes = input.arguments[0] as string;

    let registries: IRegistries = await getRegistry(profile);

    registries = await putRegistry(profile, scopes.split(','));

    await printRegistries(executeService, registries);

    return 0;
  }
}
