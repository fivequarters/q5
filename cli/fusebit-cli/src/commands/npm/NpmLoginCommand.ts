const { spawn } = require('child_process');

import { ArgType, Command, ICommand, IExecuteInput } from '@5qtrs/cli';

import { ProfileService } from '../../services/ProfileService';

import { getProtoUrl, getRegistry } from './Registry';

const commandDesc: ICommand = {
  name: 'NPM Login',
  cmd: 'login',
  summary: 'Create or update an .npmrc file',
  description: 'Create or update the .npmrc file manipulated via `npm config`.',
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
  ],
};

export class NpmLoginCommand extends Command {
  public static async create() {
    return new NpmLoginCommand(commandDesc);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const location = input.options.location as string;

    const profileService = await ProfileService.create(input);
    const profile = await profileService.getExecutionProfile();
    const registries = await getRegistry(profile);

    for (const registry of Object.values(registries)) {
      let result;
      for (const scope of registry.scopes) {
        result = await this.addScopedRegistry(scope, registry.url);
        if (result !== 0) {
          await input.io.writeLineRaw(`ERROR: Failed to write ${scope}/${registry.url} to .npmrc`);
          return result;
        }
      }
      result = await this.addRegistryToken(registry.url, profile.accessToken);
      if (result !== 0) {
        await input.io.writeLineRaw(`ERROR: Failed to write auth token for ${registry.url} to .npmrc`);
        return result;
      }
    }

    await input.io.writeLineRaw('Logged in to the Fusebit NPM service.');
    return 0;
  }

  // npm config set "@monkey:registry" "foobarbah"
  private async addScopedRegistry(scope: string, url: string): Promise<number> {
    const args: string[] = ['config', 'set', `${scope}:registry`, url];
    const child = spawn('npm', args, { stdio: 'inherit', env: { ...process.env } });

    const exitCode: number = await new Promise((resolve, reject) => {
      child.on('close', resolve);
    });

    return exitCode;
  }

  // npm config set //foobarbah/:_authToken AAAAAAAAAAAAAAAAAAAAAAA
  private async addRegistryToken(url: string, token: string): Promise<number> {
    const args: string[] = ['config', 'set', `${getProtoUrl(url)}:_authToken`, token];
    const child = spawn('npm', args, { stdio: 'inherit', env: { ...process.env } });

    const exitCode: number = await new Promise((resolve, reject) => {
      child.on('close', resolve);
    });

    return exitCode;
  }
}
