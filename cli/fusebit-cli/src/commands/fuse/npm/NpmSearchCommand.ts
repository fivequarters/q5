const { spawn } = require('child_process');

import { ArgType, Command, ICommand, IExecuteInput } from '@5qtrs/cli';

import { ProfileService } from '../../../services/ProfileService';

import { createEnv } from './Npm';

import { getRegistry } from './registry/Registry';

const commandDesc: ICommand = {
  name: 'npm package search',
  cmd: 'search',
  summary: 'Search for packages matching a keyword',
  description: ['Search for packages in the Fusebit npm repository that have the keyword in the name.'].join(' '),
  arguments: [
    {
      name: 'keyword',
      description: 'The keyword to search for',
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
    {
      name: 'long',
      aliases: ['l'],
      description: 'Show long descriptions of matching packages',
      type: ArgType.boolean,
      default: 'false',
    },
  ],
};

export class NpmSearchCommand extends Command {
  public static async create() {
    return new NpmSearchCommand(commandDesc);
  }

  private constructor(command: ICommand) {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const longDesc = input.options.long as boolean;

    const profileService = await ProfileService.create(input);
    const profile = await profileService.getExecutionProfile();
    const registries = await getRegistry(profile);

    // For now, just use any one of the registries as the default (where searches go).
    // In the future, query all of them and collate the results.
    const env = createEnv(profile, registries, true);

    // Delegate to the npm executable
    const args: string[] = (longDesc
      ? ['search', '--userconfig', '.'].concat('--long')
      : ['search', '--userconfig', '.']
    ).concat([input.arguments[0] as string]);
    const child = spawn('npm', args, { shell: true, stdio: 'inherit', env: { ...process.env, ...env } });

    const exitCode: number = await new Promise((resolve, reject) => {
      child.on('close', resolve);
    });

    return exitCode;
  }
}
