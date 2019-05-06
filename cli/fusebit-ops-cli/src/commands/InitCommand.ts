import { Command, IExecuteInput } from '@5qtrs/cli';
import { ProfileService } from '../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'CLI Initialize',
  cmd: 'init',
  summary: 'Initialize the CLI',
  description: 'Initializes use of the CLI to be able to perform operations on the Fusebit platform.',
  options: [
    {
      name: 'awsMainAccount',
      description: 'The main AWS account',
    },
    {
      name: 'awsUserAccount',
      description: 'The AWS user account number',
    },
    {
      name: 'awsMainRole',
      description: 'The AWS role to assume to access the main AWS account when using an AWS user account',
    },
    {
      name: 'awsUserName',
      description: 'The AWS user name',
    },
    {
      name: 'awsSecretAccessKey',
      description: 'The AWS user secret access key',
    },
    {
      name: 'awsAccessKeyId',
      description: 'The AWS user access key id',
    },
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to create with the initalization of the CLI',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class InitCommand extends Command {
  public static async create() {
    return new InitCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    let profileName = input.options.profile as string | undefined;
    const awsMainAccount = input.options.awsMainAccount as string;
    const awsUserAccount = input.options.awsUserAccount as string;
    const awsMainRole = input.options.awsMainRole as string;
    const awsUserName = input.options.awsUserName as string;
    const awsSecretAccessKey = input.options.awsSecretAccessKey as string;
    const awsAccessKeyId = input.options.awsAccessKeyId as string;

    const profileService = await ProfileService.create(input);

    if (!profileName) {
      profileName = await profileService.getDefaultProfileName();
      if (!profileName) {
        profileName = await profileService.getDefaultDefaultProfileName();
      }
    }

    const existing = await profileService.getProfile(profileName);
    if (existing) {
      await profileService.confirmInitProfile(profileName, existing);
      await profileService.removeProfile(profileName);
    }

    const initialSettings = {
      awsMainAccount,
      awsUserAccount,
      awsMainRole,
      awsUserName,
      awsSecretAccessKey,
      awsAccessKeyId,
    };

    const settings = await profileService.promptForMissingSettings(initialSettings);
    const profile = await profileService.addProfile(profileName, settings);
    await profileService.displayProfile(profile);

    return 0;
  }
}
