import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import {
  FusebitOpsProfile,
  IFusebitOpsProfile,
  IFusebitOpsProfileSettings,
  FusebitOpsProfileException,
  FusebitOpsProfileExceptionCode,
} from '@5qtrs/fusebit-ops-profile-sdk';
import { ExecuteService } from './ExecuteService';

// ------------------
// Internal Constants
// ------------------

const secretKeyMasked = '••••••••••';
const notSet = Text.dim(Text.italic('<not set>'));

// ------------------
// Internal Functions
// ------------------

function getDateString(date: Date) {
  return date.toLocaleString();
}

// ----------------
// Exported Classes
// ----------------

export class ProfileService {
  private input: IExecuteInput;
  private profile: FusebitOpsProfile;
  private executeService: ExecuteService;

  private constructor(profile: FusebitOpsProfile, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profile = profile;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const fusebitOpsProfile = await FusebitOpsProfile.create();
    const executeService = await ExecuteService.create(input);
    return new ProfileService(fusebitOpsProfile, executeService, input);
  }

  public async listProfiles(): Promise<IFusebitOpsProfile[]> {
    return this.execute(() => this.profile.listProfiles());
  }

  public async getProfile(name: string): Promise<IFusebitOpsProfile | undefined> {
    return this.execute(() => this.profile.getProfile(name));
  }

  public async getProfileOrThrow(name: string): Promise<IFusebitOpsProfile> {
    return this.execute(() => this.profile.getProfileOrThrow(name));
  }

  public async getDefaultProfileOrThrow(): Promise<IFusebitOpsProfile> {
    return this.execute(() => this.profile.getProfileOrDefaultOrThrow());
  }

  public async getProfileOrDefaultOrThrow(name?: string): Promise<IFusebitOpsProfile> {
    name = name || (this.input.options.profile as string);
    return this.execute(() => this.profile.getProfileOrDefaultOrThrow(name));
  }

  public async getDefaultProfileName(): Promise<string | undefined> {
    return this.execute(() => this.profile.getDefaultProfileName());
  }

  public async setDefaultProfileName(name: string): Promise<void> {
    await this.execute(() => this.profile.setDefaultProfileName(name));
    await this.executeService.message(
      'Profile set',
      Text.create("The '", Text.bold(name), "' profile was successfully set as the default profile")
    );
  }

  public async getDefaultDefaultProfileName(): Promise<string> {
    return this.profile.defaultDefaultProfileName;
  }

  public async getCachedCreds(name: string, key: string): Promise<any> {
    return this.execute(() => this.profile.getCachedCreds(name, key));
  }

  public async setCachedCreds(name: string, key: string, creds: any): Promise<void> {
    return this.execute(() => this.profile.setCachedCreds(name, key, creds));
  }

  public async addProfile(name: string, settings: IFusebitOpsProfileSettings): Promise<IFusebitOpsProfile> {
    return this.execute(() => this.profile.addProfile(name, settings));
  }

  public async copyProfile(name: string, copyTo: string): Promise<IFusebitOpsProfile> {
    const profile = await this.execute(() => this.profile.copyProfile(name, copyTo, true));
    await this.executeService.result(
      'Profile Copied',
      Text.create(
        "The '",
        Text.bold(name),
        "' profile was successfully copied to create the '",
        Text.bold(copyTo),
        "' profile"
      )
    );

    return profile;
  }

  public async updateProfile(name: string, profile: IFusebitOpsProfileSettings): Promise<IFusebitOpsProfile> {
    const updatedProfile = await this.execute(() => this.profile.updateProfile(name, profile));
    await this.executeService.result(
      'Profile Updated',
      Text.create("The '", Text.bold(name), "' profile was successfully updated")
    );

    return updatedProfile;
  }

  public async renameProfile(name: string, renameTo: string): Promise<IFusebitOpsProfile> {
    const profile = await this.execute(() => this.profile.renameProfile(name, renameTo, true));
    await this.executeService.result(
      'Profile Renamed',
      Text.create("The '", Text.bold(name), "' profile was successfully renamed to '", Text.bold(renameTo), "'")
    );
    return profile;
  }

  public async removeProfile(name: string): Promise<void> {
    await this.execute(() => this.profile.removeProfile(name));
    await this.executeService.result(
      'Profile Removed',
      Text.create("The '", Text.bold(name), "' profile was successfully removed")
    );
  }

  public async promptForMissingSettings(settings: any): Promise<IFusebitOpsProfileSettings> {
    const accountInfoNeeded = !settings.awsMainAccount;
    const userInfoNeeded =
      !settings.credentialsProvider &&
      (!settings.awsUserName || !settings.awsAccessKeyId || !settings.awsSecretAccessKey);
    let credentialsProviderInfoNeeded: boolean = false;

    const io = this.input.io;
    if (accountInfoNeeded || userInfoNeeded) {
      await io.writeLine(Text.bold("To initialize the Fusebit Ops CLI we'll need to collect some information."));
      await io.writeLine();
      if (userInfoNeeded) {
        const credentialsPrompt = await Confirm.create({
          header: 'AWS Credentials',
          message: 'Do you have a custom AWS credentials provider executable you want to use?',
          details: [
            {
              name: 'Yes',
              value:
                'You will be asked for the full command line to the custom credentials provider executable, as documented at https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sourcing-external.html',
            },
            {
              name: 'No',
              value:
                'You will be asked to manually enter your IAM user name, access key ID, secret access key, and IAM role to assume',
            },
          ],
        });
        credentialsProviderInfoNeeded = await credentialsPrompt.prompt(this.input.io);
      }
    }

    if (accountInfoNeeded) {
      settings.awsMainAccount = await io.prompt({
        prompt: 'AWS Main Account Number:',
        placeholder: '(Required)',
        required: true,
      });
    }

    if (userInfoNeeded) {
      if (credentialsProviderInfoNeeded) {
        settings.credentialsProvider = await io.prompt({
          prompt: 'Custom AWS Credentials Provider Command:',
          placeholder: '(Full command line)',
          required: true,
        });
      } else {
        settings.awsUserAccount = await io.prompt({
          prompt: 'AWS Users Account Number:',
          placeholder: '(Required)',
          required: true,
        });
        settings.awsMainRole = await io.prompt({
          prompt: 'AWS Role in the Main Account to Assume:',
          placeholder: '(Required)',
          required: true,
        });
        const settingsPath = await this.profile.getSettingsPath();
        await io.writeLine(
          Text.create(
            'Please provide information about the ',
            Text.bold('individual'),
            ' AWS user that you use to access the AWS account(s) on which you are ',
            'hosting your installation of the Fusebit platform.',
            Text.eol(),
            Text.eol(),
            Text.boldItalic(`Note: Your secret access key will be stored on disk at '${settingsPath}'`)
          )
        );
        await io.writeLine();

        settings.awsUserName = await io.prompt({
          prompt: 'AWS User Name:',
          placeholder: '(Required)',
          required: true,
        });

        settings.awsAccessKeyId = await io.prompt({
          prompt: 'AWS Access Key Id:',
          placeholder: '(Required)',
          required: true,
        });

        settings.awsSecretAccessKey = await io.prompt({
          prompt: 'AWS Secret Access Key:',
          placeholder: '(Required)',
          required: true,
          mask: true,
        });
      }
    }

    return settings as IFusebitOpsProfileSettings;
  }

  public async confirmCopyProfile(name: string, copyTo: string, profile: IFusebitOpsProfile): Promise<void> {
    const confirmPrompt = await Confirm.create({
      header: 'Overwrite?',
      message: Text.create(
        "The '",
        Text.bold(copyTo),
        "' profile already exists. Overwrite the existing profile shown below?"
      ),
      details: this.getProfileConfirmDetails(profile),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Copy Canceled',
        Text.create("Copying the '", Text.bold(name), "' profile was canceled")
      );
      throw new Error('Copy Canceled');
    }
  }

  public async confirmInitProfile(name: string, profile: IFusebitOpsProfile): Promise<void> {
    const confirmPrompt = await Confirm.create({
      header: 'Overwrite?',
      message: Text.create(
        "The '",
        Text.bold(name),
        "' profile already exists. Initialize and overwrite the existing profile shown below?"
      ),
      details: this.getProfileConfirmDetails(profile),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Init Canceled',
        Text.create("Initializing the '", Text.bold(name), "' profile was canceled")
      );
      throw new Error('Init Canceled');
    }
  }

  public async confirmUpdateProfile(profile: IFusebitOpsProfile, settings: IFusebitOpsProfileSettings): Promise<void> {
    const confirmPrompt = await Confirm.create({
      header: 'Update?',
      message: Text.create("Update the '", Text.bold(profile.name), "' profile as shown below?"),
      details: this.getProfileUpdateConfirmDetails(profile, settings),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Update Canceled',
        Text.create("Updating the '", Text.bold(profile.name), "' profile was canceled")
      );
      throw new Error('Update Canceled');
    }
  }

  public async confirmRenameProfile(source: string, target: string, profile: IFusebitOpsProfile): Promise<void> {
    const confirmPrompt = await Confirm.create({
      header: 'Overwrite?',
      message: Text.create(
        "The '",
        Text.bold(target),
        "' profile already exists. Overwrite the existing profile shown below?"
      ),
      details: this.getProfileConfirmDetails(profile),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Rename Canceled',
        Text.create("Renaming the '", Text.bold(source), "' profile was canceled")
      );
      throw new Error('Rename Canceled');
    }
  }

  public async confirmRemoveProfile(name: string, profile: IFusebitOpsProfile): Promise<void> {
    const confirmPrompt = await Confirm.create({
      header: 'Remove?',
      message: Text.create("Remove the '", Text.bold(name), "' profile shown below?"),
      details: this.getProfileConfirmDetails(profile),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Remove Canceled',
        Text.create("Removing the '", Text.bold(name), "' profile was canceled.")
      );
      throw new Error('Remove Canceled');
    }
  }

  public async displayProfiles(profiles: IFusebitOpsProfile[]) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(profiles, null, 2));
      return;
    }

    this.executeService.message(Text.cyan('Profiles'), Text.cyan('Details'));
    const defaultProfileName = await this.profile.getDefaultProfileName();

    for (const profile of profiles) {
      await this.writeProfile(profile, profile.name === defaultProfileName);
    }
  }

  public async displayProfile(profile: IFusebitOpsProfile) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(profile, null, 2));
      return;
    }

    const defaultProfileName = await this.profile.getDefaultProfileName();

    await this.writeProfile(profile, profile.name === defaultProfileName);
  }

  private getProfileUpdateConfirmDetails(profile: IFusebitOpsProfile, settings: IFusebitOpsProfileSettings) {
    const awsAccessKeyId = profile.awsAccessKeyId || notSet;
    const awsSecretAccessKey = profile.awsSecretAccessKey || notSet;
    const credentialsProvider = profile.credentialsProvider || notSet;
    const awsUserName = profile.awsUserName || notSet;

    const newAccessKeyId = settings.awsAccessKeyId || notSet;
    const newSecretAccessKey = settings.awsSecretAccessKey || notSet;
    const newCredentialsProvider = settings.credentialsProvider || notSet;
    const newAwsUserName = settings.awsUserName || notSet;

    const accessKeyIdValue =
      awsAccessKeyId === newAccessKeyId
        ? Text.create(awsAccessKeyId, Text.dim(' (no change)'))
        : Text.create(awsAccessKeyId, Text.dim(' → '), newAccessKeyId);
    const secretAccessKeyValue =
      awsSecretAccessKey === newSecretAccessKey
        ? Text.create(secretKeyMasked, Text.dim(' (no change)'))
        : Text.create(secretKeyMasked, Text.dim(' → '), secretKeyMasked);
    const credentialsProviderValue =
      credentialsProvider === newCredentialsProvider
        ? Text.create(credentialsProvider, Text.dim(' (no change)'))
        : Text.create(credentialsProvider, Text.dim(' → '), newCredentialsProvider);
    const awsUserNameValue =
      awsUserName === newAwsUserName
        ? Text.create(awsUserName, Text.dim(' (no change)'))
        : Text.create(awsUserName, Text.dim(' → '), newAwsUserName);

    return [
      { name: 'Main Account', value: profile.awsMainAccount },
      { name: 'Credentials Provider', value: credentialsProviderValue },
      { name: 'User Name', value: awsUserNameValue },
      { name: 'Access Key', value: accessKeyIdValue },
      { name: 'Secret Key', value: secretAccessKeyValue },
    ];
  }

  private getProfileConfirmDetails(profile: IFusebitOpsProfile) {
    return [
      { name: 'Main Account', value: profile.awsMainAccount },
      { name: 'Credentials Provider', value: profile.credentialsProvider || notSet },
      { name: 'User Account', value: profile.awsUserAccount || notSet },
      { name: 'Main Role', value: profile.awsMainRole || notSet },
      { name: 'User Name', value: profile.awsUserName || notSet },
      { name: 'Access Key', value: profile.awsAccessKeyId || notSet },
    ];
  }

  private async execute<T>(func: () => Promise<T>) {
    try {
      const result = await func();
      return result;
    } catch (error) {
      if (error instanceof FusebitOpsProfileException) {
        await this.writeFusebitProfileErrorMessage(error);
      } else {
        await this.writeErrorMessage(error);
      }
      throw error;
    }
  }

  private async writeFusebitProfileErrorMessage(exception: FusebitOpsProfileException) {
    switch (exception.code) {
      case FusebitOpsProfileExceptionCode.profileDoesNotExist:
        this.executeService.error(
          'No Profile',
          Text.create("The profile '", Text.bold(exception.params[0]), "' does not exist")
        );
        return;
      case FusebitOpsProfileExceptionCode.profileAlreadyExists:
        this.executeService.error(
          'Profile Exists',
          Text.create("The profile '", Text.bold(exception.params[0]), "' already exists")
        );
        return;
      case FusebitOpsProfileExceptionCode.noDefaultProfile:
        this.executeService.error('No Profile', 'There is no default profile set');
        return;
      default:
        this.executeService.error('Profile Error', exception.message);
        return;
    }
  }

  private async writeErrorMessage(error: Error) {
    this.executeService.error('Profile Error', error.message);
  }

  private async writeProfile(profile: IFusebitOpsProfile, isDefault: boolean) {
    const details = [Text.dim('AWS Main Account: '), profile.awsMainAccount, Text.eol()];
    if (profile.credentialsProvider) {
      details.push(Text.dim('Credentials provider: '));
      details.push(profile.credentialsProvider);
      details.push(Text.eol());
    } else {
      if (profile.awsUserAccount) {
        details.push(Text.dim('AWS User Account: '));
        details.push(profile.awsUserAccount);
        details.push(Text.eol());
      }
      if (profile.awsMainRole) {
        details.push(Text.dim('AWS Main Role: '));
        details.push(profile.awsMainRole);
        details.push(Text.eol());
      }

      if (profile.awsUserName) {
        details.push(Text.dim('AWS User Name: '));
        details.push(profile.awsUserName);
        details.push(Text.eol());
      }

      if (profile.awsSecretAccessKey) {
        details.push(Text.dim('AWS User Access Key Id: '));
        details.push(profile.awsAccessKeyId);
        details.push(Text.eol());
      }
    }
    details.push(
      ...[
        Text.dim('Created: '),
        getDateString(new Date(profile.created)),
        Text.eol(),
        Text.dim('Last Updated: '),
        getDateString(new Date(profile.updated)),
      ]
    );
    const name = isDefault
      ? Text.create(Text.bold(profile.name), Text.eol(), Text.dim(Text.italic('<default>')))
      : Text.bold(profile.name);
    await this.executeService.message(name, Text.create(details));
  }
}
