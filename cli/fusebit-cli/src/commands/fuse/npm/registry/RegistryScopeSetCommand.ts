import { EOL } from 'os';

import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { IText, Text } from '@5qtrs/text';

import { REGISTRY_RESERVED_SCOPE_PREFIX } from '@5qtrs/constants';

import { ExecuteService } from '../../../../services/ExecuteService';
import { ProfileService } from '../../../../services/ProfileService';

import { getRegistry, IRegistries, printRegistries, putRegistry } from './Registry';

const commandDesc: ICommand = {
  name: 'Set registry scopes',
  cmd: 'set',
  summary: 'Set the allowed registry scopes',
  description: [
    'Set the allowed registry scopes as a series of comma separated scopes.',
    `For example, "@scope1,@scope2,@internal,@packages".`,
    `${EOL}${EOL}NOTE: scopes that start with "${REGISTRY_RESERVED_SCOPE_PREFIX}" are reserved for system use only.`,
  ].join(' '),
  arguments: [
    {
      name: 'scopes',
      description: 'The scopes to set the registry to support.',
      required: true,
    },
  ],
  options: [],
};

export class RegistryScopeSetCommand extends Command {
  public static async create() {
    return new RegistryScopeSetCommand(commandDesc);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    const profile = await profileService.getExecutionProfile();

    const scopes = (input.arguments[0] as string).split(',');

    if (scopes.filter((s: string) => s.indexOf(REGISTRY_RESERVED_SCOPE_PREFIX) === 0).length) {
      await executeService.error(
        'Invalid Scopes',
        `Scopes starting with '${REGISTRY_RESERVED_SCOPE_PREFIX}' are not allowed.`
      );

      return -1;
    }

    const registries = await putRegistry(profile, executeService, scopes);

    await printRegistries(executeService, registries);

    return 0;
  }
}
