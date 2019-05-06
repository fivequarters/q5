import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ProfileService } from '../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Update Profile',
  cmd: 'update',
  summary: 'Update a profile',
  description: Text.create('Updates the AWS user access key id and secret key id of the stored profile.'),
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to update',
      defaultText: 'default profile',
    },
    {
      name: 'awsAccessKeyId',
      description: 'The AWS user access key id',
    },
    {
      name: 'awsSecretAccessKey',
      description: 'The AWS user secret access key',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before updating the profile',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ProfileUpdateCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileUpdateCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const name = input.options.profile as string;
    const awsSecretAccessKey = input.options.awsSecretAccessKey as string;
    const awsAccessKeyId = input.options.awsAccessKeyId as string;
    const confirm = input.options.confirm as boolean;

    const profileService = await ProfileService.create(input);

    const profile = await profileService.getProfileOrDefaultOrThrow(name);

    const settings = {
      awsMainAccount: profile.awsMainAccount,
      awsUserAccount: profile.awsUserAccount,
      awsMainRole: profile.awsMainRole,
      awsUserName: profile.awsUserName,
      awsSecretAccessKey: awsSecretAccessKey || profile.awsSecretAccessKey,
      awsAccessKeyId: awsAccessKeyId || profile.awsAccessKeyId,
    };

    if (confirm) {
      await profileService.confirmUpdateProfile(profile, settings);
    }

    const updatedProfile = await profileService.updateProfile(profile.name, settings);

    await profileService.displayProfile(updatedProfile);

    return 0;
  }
}
