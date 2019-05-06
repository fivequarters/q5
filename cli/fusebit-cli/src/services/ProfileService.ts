import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import {
  FusebitProfile,
  IFusebitExecutionProfile,
  IFusebitNewProfile,
  IFusebitProfile,
  IFusebitProfileSettings,
  FusebitProfileError,
  FusebitProfileErrorCode,
} from '@5qtrs/fusebit-profile-sdk';
import { profileConvert } from './profileConvert';
import { ExecuteService } from './ExecuteService';

// ------------------
// Internal Constants
// ------------------

const profileOptions = ['account', 'subscription', 'boundary', 'function'];
const notSet = Text.dim(Text.italic('<not set>'));

// ------------------
// Internal Functions
// ------------------

function getDateString(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateOnly = new Date(date.valueOf());
  dateOnly.setHours(0, 0, 0, 0);

  const dateOnlyMs = dateOnly.valueOf();
  const [dateString, timeString] = date.toLocaleString().split(',');
  return dateOnlyMs === today.valueOf() ? timeString.trim() : dateString.trim();
}

// ----------------
// Exported Classes
// ----------------

export class ProfileService {
  private input: IExecuteInput;
  private profile: FusebitProfile;
  private executeService: ExecuteService;

  private constructor(profile: FusebitProfile, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profile = profile;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const flexdProfile = await FusebitProfile.create();
    const executeService = await ExecuteService.create(input);
    return new ProfileService(flexdProfile, executeService, input);
  }

  public async listProfiles(): Promise<IFusebitProfile[]> {
    return this.execute(() => this.profile.listProfiles());
  }

  public async getProfileNameFromBaseUrl(baseUrl: string): Promise<string> {
    return this.execute(() => this.profile.getProfileNameFromBaseUrl(baseUrl));
  }

  public async getPublicKey(name: string): Promise<string> {
    return this.execute(() => this.profile.getPublicKey(name));
  }

  public async getProfile(name: string): Promise<IFusebitProfile | undefined> {
    return this.execute(() => this.profile.getProfile(name));
  }

  public async getProfileOrThrow(name: string): Promise<IFusebitProfile> {
    return this.execute(() => this.profile.getProfileOrThrow(name));
  }

  public async getDefaultProfileOrThrow(): Promise<IFusebitProfile> {
    return this.execute(() => this.profile.getProfileOrDefaultOrThrow());
  }

  public async getProfileOrDefaultOrThrow(name?: string): Promise<IFusebitProfile> {
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

  public async addProfile(name: string, newProfile: IFusebitNewProfile): Promise<IFusebitProfile> {
    return this.execute(() => this.profile.addProfile(name, newProfile));
  }

  public async copyProfile(name: string, copyTo: string): Promise<IFusebitProfile> {
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

  public async updateProfile(name: string, profile: IFusebitProfileSettings): Promise<IFusebitProfile> {
    const updatedProfile = await this.execute(() => this.profile.updateProfile(name, profile));
    await this.executeService.result(
      'Profile Updated',
      Text.create("The '", Text.bold(name), "' profile was successfully updated")
    );

    return updatedProfile;
  }

  public async renameProfile(name: string, renameTo: string): Promise<IFusebitProfile> {
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

  public async confirmCopyProfile(name: string, copyTo: string, profile: IFusebitProfile): Promise<void> {
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

  public async confirmInitProfile(name: string, profile: IFusebitProfile): Promise<void> {
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

  public async confirmUpdateProfile(profile: IFusebitProfile, settings: IFusebitProfileSettings): Promise<void> {
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

  public async confirmRenameProfile(source: string, target: string, profile: IFusebitProfile): Promise<void> {
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

  public async confirmRemoveProfile(name: string, profile: IFusebitProfile): Promise<void> {
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

  public async getExecutionProfile(
    expected?: string[],
    defaults?: IFusebitProfileSettings
  ): Promise<IFusebitExecutionProfile> {
    try {
      await profileConvert();
    } catch (__) {
      // do_nothing
    }

    const profileName = this.input.options.profile as string;
    const profile = await this.execute(() => this.profile.getExecutionProfile(profileName));

    for (const option of profileOptions) {
      if (this.input.options[option]) {
        profile[option] = this.input.options[option] as string;
      } else if (defaults && (defaults[option] || defaults[`${option}Id`])) {
        profile[option] = defaults[option] || defaults[`${option}Id`];
      }
    }

    for (const expect of expected || []) {
      if (profile[expect] === undefined) {
        this.executeService.error(
          'Option Required',
          Text.create("The '", Text.bold(expect), "' option must be specified as it is not specified in the profile.")
        );
        throw new Error('Option Required');
      }
    }

    return profile;
  }

  public async displayProfiles(profiles: IFusebitProfile[]) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(profiles, null, 2));
      return;
    }

    this.executeService.message(Text.blue('Profiles'), Text.blue('Details'));
    const defaultProfileName = await this.profile.getDefaultProfileName();

    for (const profile of profiles) {
      await this.writeProfile(profile, profile.name === defaultProfileName);
    }
  }

  public async displayProfile(profile: IFusebitProfile) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(profile, null, 2));
      return;
    }

    const defaultProfileName = await this.profile.getDefaultProfileName();

    await this.writeProfile(profile, profile.name === defaultProfileName);
  }

  public async displayTokenContext(profileName?: string) {
    if (!profileName) {
      profileName = await this.profile.getDefaultProfileName();
    }

    const profile = await this.profile.getExecutionProfile(profileName, true);

    if (this.input.options.format === 'json') {
      await console.log(JSON.stringify(profile, null, 2));
      return;
    }

    const details = [
      Text.dim('Deployment: '),
      profile.baseUrl,
      Text.eol(),
      Text.dim('Account: '),
      profile.account || notSet,
      Text.eol(),
      Text.dim('Access Token: '),
      'Token below will be valid for the next 2 hours...',
    ];

    await this.executeService.info(profileName as string, Text.create(details));

    console.log(profile.accessToken);
    console.log();
  }

  private getProfileUpdateConfirmDetails(profile: IFusebitProfile, settings: IFusebitProfileSettings) {
    const subscription = profile.subscription || notSet;
    const boundary = profile.boundary || notSet;
    const func = profile.function || notSet;

    const newSubscription = settings.subscription || notSet;
    const newBoundary = settings.boundary || notSet;
    const newFunction = settings.function || notSet;

    const subscriptionValue =
      subscription === newSubscription
        ? Text.create(subscription, Text.dim(' (no change)'))
        : Text.create(subscription, Text.dim(' → '), newSubscription);
    const boundaryValue =
      boundary === newBoundary
        ? Text.create(boundary, Text.dim(' (no change)'))
        : Text.create(boundary, Text.dim(' → '), newBoundary);
    const functionValue =
      func === newFunction
        ? Text.create(func, Text.dim(' (no change)'))
        : Text.create(func, Text.dim(' → '), newFunction);

    return [
      { name: 'Deployment', value: profile.baseUrl },
      { name: 'Account', value: profile.account },
      { name: 'Subscription', value: subscriptionValue },
      { name: 'Boundary', value: boundaryValue },
      { name: 'Function', value: functionValue },
    ];
  }

  private getProfileConfirmDetails(profile: IFusebitProfile) {
    return [
      { name: 'Deployment', value: profile.baseUrl },
      { name: 'Account', value: profile.account || notSet },
      { name: 'Subscription', value: profile.subscription || notSet },
      { name: 'Boundary', value: profile.boundary || notSet },
      { name: 'Function', value: profile.function || notSet },
    ];
  }

  private async execute<T>(func: () => Promise<T>) {
    try {
      const result = await func();
      return result;
    } catch (error) {
      if (error instanceof FusebitProfileError) {
        await this.writeFusebitProfileErrorMessage(error);
      } else {
        await this.writeErrorMessage(error);
      }
      throw error;
    }
  }

  private async writeFusebitProfileErrorMessage(error: FusebitProfileError) {
    switch (error.code) {
      case FusebitProfileErrorCode.profileDoesNotExist:
        this.executeService.error(
          'No Profile',
          Text.create("The profile '", Text.bold(error.entity), "' does not exist")
        );
        return;
      case FusebitProfileErrorCode.profileAlreadyExists:
        this.executeService.error(
          'Profile Exists',
          Text.create("The profile '", Text.bold(error.entity), "' already exists")
        );
        return;
      case FusebitProfileErrorCode.baseUrlMissingProtocol:
        this.executeService.error(
          'Base Url',
          Text.create("The base url '", Text.bold(error.entity), "' does not include the protocol, 'http' or 'https'")
        );
        return;
      case FusebitProfileErrorCode.noDefaultProfile:
        this.executeService.error('No Profile', 'There is no default profile set');
        return;
      default:
        this.executeService.error('Profile Error', error.message);
        return;
    }
  }

  private async writeErrorMessage(error: Error) {
    this.executeService.error('Profile Error', error.message);
  }

  private async writeProfile(profile: IFusebitProfile, isDefault: boolean) {
    const details = [
      Text.dim('Deployment: '),
      profile.baseUrl,
      Text.eol(),
      Text.dim('Account: '),
      profile.account || notSet,
      Text.eol(),
    ];

    if (profile.subscription) {
      details.push(Text.dim('Subscription: '));
      details.push(profile.subscription);
      details.push(Text.eol());
    }

    if (profile.boundary) {
      details.push(Text.dim('Boundary: '));
      details.push(profile.boundary);
      details.push(Text.eol());
    }
    if (profile.function) {
      details.push(Text.dim('Function: '));
      details.push(profile.function);
      details.push(Text.eol());
    }

    details.push(
      ...[
        Text.dim('Created: '),
        getDateString(new Date(profile.created)),
        Text.dim(' • '),
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
