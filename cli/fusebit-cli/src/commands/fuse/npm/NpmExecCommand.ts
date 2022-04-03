const { spawn } = require('child_process');

import { Command, ICommand, ICommandIO, IExecuteInput } from '@5qtrs/cli';
import { FusebitProfile, IFusebitExecutionProfile, IFusebitProfile } from '@5qtrs/fusebit-profile-sdk';

import { ProfileService } from '../../../services';

import { createEnv } from './Npm';

import { getRegistry } from './registry/Registry';

// ------------------
// Internal Constants
// ------------------

const commandDesc: ICommand = {
  name: 'Execute npm Commands',
  cmd: 'exec',
  summary: 'Execute npm commands with the appropriate Fusebit login credentials',
  description: [
    'Execute commands with the Fusebit registry for this profile mapped to',
    'the appropriate npm scopes.',
  ].join(' '),
  delegate: true,
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class NpmExecCommand extends Command {
  public static async create() {
    return new NpmExecCommand(commandDesc);
  }

  private constructor(command: ICommand) {
    super(command);
  }

  public async execute(args: string[], io: ICommandIO): Promise<number> {
    // Chop off the leading 'npm exec'
    args = args.slice(2);

    const profile = await this.getProfile(args, io);
    const registries = await getRegistry(profile);

    // Populate
    const env = createEnv(profile, registries);

    const child = spawn('npm', args, {
      shell: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...env,
      },
    });

    const exitCode: number = await new Promise((resolve, reject) => {
      child.on('close', resolve);
    });

    return exitCode;
  }

  private async getProfile(args: string[], io: ICommandIO) {
    const options: { [key: string]: string } = {};

    // Is --profile on the parameters anywhere?
    const profileIndex = args.findIndex((p) => p === '--profile');
    if (profileIndex >= 0) {
      const profileName = args[profileIndex + 1];
      // Remove the `--profile profileName` option from the command line
      args.splice(profileIndex, 2);
      options.profile = profileName;
    }

    const profileService = await ProfileService.create({ terms: [], arguments: [], options, io });
    return profileService.getExecutionProfile();
  }
}
