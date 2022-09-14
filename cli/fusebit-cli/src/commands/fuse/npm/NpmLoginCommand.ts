const { spawn } = require('child_process');

import { ArgType, Command, ICommand, IExecuteInput } from '@5qtrs/cli';

import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { Text } from '@5qtrs/text';
import { ExecuteService } from '../../../services/ExecuteService';
import { ProfileService } from '../../../services/ProfileService';

import { getProtoUrl, getRegistry, IRegistries } from './registry/Registry';

const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const withTempFile = (fn: any) => withTempDir((dir: string) => fn(path.join(dir, 'file')));

const withTempDir = async (fn: any) => {
  const dir = await fs.mkdtemp((await fs.realpath(os.tmpdir())) + path.sep);
  try {
    return await fn(dir);
  } finally {
    fs.rmdir(dir, { recursive: true });
  }
};

const commandDesc: ICommand = {
  name: 'npm login',
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
    {
      name: 'output',
      aliases: ['o'],
      description:
        "The format to display the output: 'pretty', 'json', 'npmrc'.  Formats other than 'pretty' will not write to `~/.npmrc.`",
      default: 'pretty',
    },
  ],
};

export class NpmLoginCommand extends Command {
  public static async create() {
    return new NpmLoginCommand(commandDesc);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const location = input.options.location as string;
    const output = input.options.output as string;

    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    const profile = await profileService.getExecutionProfile();
    const registries = await getRegistry(profile);

    if (output === 'json') {
      await input.io.writeLineRaw(JSON.stringify({ registries, token: profile.accessToken }));
      return 0;
    }

    let scopes: string[] = [];

    if (output === 'npmrc') {
      const npmrc = await withTempFile(
        async (file: string): Promise<string> => {
          const result = await this.createNpmrc(registries, profile, executeService, file);
          if (result) {
            scopes = result;
          }
          return fs.readFile(file, 'utf8');
        }
      );
      await input.io.writeLineRaw(npmrc);
    } else {
      const result = await this.createNpmrc(registries, profile, executeService);
      if (result) {
        scopes = result;
      }
    }

    await executeService.result(
      'Login Successful',
      Text.create(
        'Logged into npm for the following scopes:',
        Text.eol(),
        Text.eol(),
        scopes.join(', '),
        Text.eol(),
        Text.eol(),
        'Packages that within those scopes are accessible via ',
        Text.bold('npm install'),
        ' and published via ',
        Text.bold('npm publish'),
        '.'
      )
    );

    return 0;
  }

  private async createNpmrc(
    registries: IRegistries,
    profile: IFusebitExecutionProfile,
    executeService: ExecuteService,
    targetFile?: string
  ): Promise<string[] | undefined> {
    const scopes = [];

    for (const registry of Object.values(registries)) {
      let result;
      for (const scope of registry.scopes) {
        scopes.push(scope);
        result = await this.addScopedRegistry(scope, registry.url, targetFile);
        if (result !== 0) {
          await executeService.error(
            'Login Failure',
            `Failed to write ${scope}/${registry.url} to ${targetFile || '.npmrc'}`
          );
          return undefined;
        }
      }
      result = await this.addRegistryToken(registry.url, profile.accessToken, targetFile);
      if (result !== 0) {
        await executeService.error(
          'Login Failure',
          `Failed to write auth token for ${registry.url} to ${targetFile || '.npmrc'}`
        );
        return undefined;
      }
    }

    return scopes;
  }

  private async addScopedRegistry(scope: string, url: string, targetFile?: string): Promise<number> {
    const config: string[] = targetFile ? ['config', '--userconfig', targetFile] : ['config'];
    const args: string[] = config.concat(['set', `${scope}:registry`, url]);
    const child = spawn('npm', args, { shell: true, stdio: 'inherit', env: { ...process.env } });

    const exitCode: number = await new Promise((resolve, reject) => {
      child.on('close', resolve);
    });

    return exitCode;
  }

  private async addRegistryToken(url: string, token: string, targetFile?: string): Promise<number> {
    const config: string[] = targetFile ? ['config', '--userconfig', targetFile] : ['config'];
    const args: string[] = config.concat(['set', `${getProtoUrl(url)}:_authToken`, token]);
    const child = spawn('npm', args, { shell: true, stdio: 'inherit', env: { ...process.env } });

    const exitCode: number = await new Promise((resolve, reject) => {
      child.on('close', resolve);
    });

    return exitCode;
  }
}
