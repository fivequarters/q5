import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { IText, Text } from '@5qtrs/text';

import { ExecuteService } from '../../services/ExecuteService';
import { ProfileService } from '../../services/ProfileService';

import { getProtoUrl, getRegistry, IRegistries, IRegistry, putRegistry } from '../registry/Registry';

const commandDesc: ICommand = {
  name: 'Set or get registry scopes',
  cmd: 'scope',
  summary: 'Set or get the allowed registry scopes',
  description: [
    'If specified, set the allowed registry scopes as a series of comma separated scopes.',
    'For example, "@scope1,@scope2,@internal,@packages"',
  ].join(' '),
  arguments: [
    {
      name: 'scopes',
      description: 'The scopes to set the registry to support.',
      required: false,
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

export class RegistryScopeCommand extends Command {
  public static async create() {
    return new RegistryScopeCommand(commandDesc);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    const profile = await profileService.getExecutionProfile();

    const scopes = input.arguments[0] as string;

    const registries: IRegistries = scopes ? await putRegistry(profile, scopes.split(',')) : await getRegistry(profile);

    await this.printRegistries(executeService, registries);

    return 0;
  }

  private async printRegistries(executeService: ExecuteService, registries: IRegistries) {
    for (const [name, registry] of Object.entries(registries)) {
      await executeService.result(`${name}`, Text.create(`${(registry as IRegistry).scopes.join(', ')}`));
    }
  }
}
