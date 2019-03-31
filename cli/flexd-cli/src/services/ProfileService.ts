import { Message, MessageKind, IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { FlexdProfile, IFlexdExecutionProfile, IFlexdProfile, IFlexdProfileSettings } from '@5qtrs/flexd-profile';
import { ExecuteService } from './ExecuteService';
import { random } from '@5qtrs/random';

// ------------------
// Internal Constants
// ------------------

const defaultBaseUrl = 'api.flexd.io';
const defaultProfileName = 'default';
const profileOptions = ['account', 'subscription', 'boundary', 'function'];
const notSet = Text.dim(Text.italic('<not set>'));

// ------------------
// Internal Functions
// ------------------

function generateIssuer(baseUrl: string) {
  return `${random()}.cli.${baseUrl}`;
}

function generateSubject() {
  return `cli-installation-${random({ lengthInBytes: 4 })}`;
}

// -------------------
// Exported Interfaces
// -------------------

// ----------------
// Exported Classes
// ----------------

export class ProfileService {
  private input: IExecuteInput;
  private profile: FlexdProfile;
  private executeService: ExecuteService;

  private constructor(profile: FlexdProfile, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profile = profile;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const flexdProfile = await FlexdProfile.create();
    const executeService = await ExecuteService.create(input);
    return new ProfileService(flexdProfile, executeService, input);
  }

  public async listProfiles(): Promise<IFlexdProfile[] | undefined> {
    return this.executeService.execute(
      {
        errorHeader: 'Profile Error',
        errorMessage: 'Unable to read the profile settings file',
      },
      async () => this.profile.listProfiles()
    );
  }

  public async getProfile(name?: string, expectProfile: boolean = true): Promise<IFlexdProfile | undefined> {
    const profileName = Text.bold(name || '<default>');
    let profileError = false;
    const profile = await this.executeService.execute(
      {
        errorHeader: 'Profile Error',
        errorMessage: Text.create("Unable to read the '", profileName, "' profile from the settings file"),
      },
      async () => {
        try {
          return this.profile.getProfile(name);
        } catch (error) {
          profileError = true;
          throw error;
        }
      }
    );
    if (expectProfile && !profile && !profileError) {
      await this.executeService.result({
        header: 'No Profile',
        message: Text.create("The '", profileName, "' profile does not exist"),
        kind: MessageKind.warning,
      });
    }
    return profile;
  }

  public async copyProfile(source: string, target: string): Promise<IFlexdProfile | undefined> {
    return this.executeService.execute(
      {
        errorHeader: 'Copy Error',
        errorMessage: Text.create(
          "Unable to copy the '",
          Text.bold(source),
          "' profile to create the new '",
          Text.bold(target),
          "' profile"
        ),
      },
      async () => this.profile.copyProfile(source, target, true)
    );
  }

  public async confirmCopyProfile(source: string, target: string, profile: IFlexdProfile): Promise<boolean> {
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
      await this.executeService.result({
        header: 'Copy Canceled',
        message: Text.create("Copying the '", Text.bold(source), "' profile was canceled"),
        kind: MessageKind.warning,
      });
    }
    return confirmed;
  }

  public async updateProfile(name: string, profile: IFlexdProfileSettings): Promise<IFlexdProfile | undefined> {
    return this.executeService.execute(
      {
        errorHeader: 'Update Error',
        errorMessage: Text.create("Unable to update the '", Text.bold(name), "' profile"),
      },
      async () => this.profile.updateProfile(name, profile)
    );
  }

  public async confirmUpdateProfile(
    name: string,
    profile: IFlexdProfile,
    settings: IFlexdProfileSettings
  ): Promise<boolean> {
    const confirmPrompt = await Confirm.create({
      header: 'Update?',
      message: Text.create("Update the '", Text.bold(name), "' profile as shown below?"),
      details: this.getProfileUpdateConfirmDetails(profile, settings),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.result({
        header: 'Update Canceled',
        message: Text.create("Updating the '", Text.bold(name), "' profile was canceled"),
        kind: MessageKind.warning,
      });
    }
    return confirmed;
  }

  public async renameProfile(source: string, target: string): Promise<IFlexdProfile | undefined> {
    return this.executeService.execute(
      {
        errorHeader: 'Rename Error',
        errorMessage: Text.create(
          "Unable to rename the '",
          Text.bold(source),
          "' profile to the '",
          Text.bold(target),
          "' profile"
        ),
      },
      async () => this.profile.renameProfile(source, target, true)
    );
  }

  public async confirmRenameProfile(source: string, target: string, profile: IFlexdProfile): Promise<boolean> {
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
      await this.executeService.result({
        header: 'Rename Canceled',
        message: Text.create("Renaming the '", Text.bold(source), "' profile was canceled"),
        kind: MessageKind.warning,
      });
    }
    return confirmed;
  }

  public async removeProfile(name: string): Promise<boolean> {
    const removeOk = await this.executeService.execute(
      {
        errorHeader: 'Remove Error',
        errorMessage: Text.create("Unable to remove the '", Text.bold(name), "' profile"),
      },
      async () => {
        await this.profile.removeProfile(name);
        return true;
      }
    );
    return removeOk === true;
  }

  public async confirmRemoveProfile(name: string, profile: IFlexdProfile): Promise<boolean> {
    const confirmPrompt = await Confirm.create({
      header: 'Remove?',
      message: Text.create("Remove the '", Text.bold(name), "' profile shown below?"),
      details: this.getProfileConfirmDetails(profile),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.result({
        header: 'Remove Canceled',
        message: Text.create("Removing the '", Text.bold(name), "' profile was canceled."),
        kind: MessageKind.warning,
      });
    }
    return confirmed;
  }

  public async setDefaultProfile(name: string): Promise<boolean> {
    const setOk = await this.executeService.execute(
      {
        errorHeader: 'Profile Error',
        errorMessage: Text.create("Unable to set the '", name, "' profile as the default"),
      },
      async () => {
        await this.profile.setDefaultProfile(name);
        return true;
      }
    );
    return setOk === true;
  }

  public async getExecutionProfile(expected?: string[]): Promise<IFlexdExecutionProfile | undefined> {
    const profileName = this.input.options.profile as string;
    const executionProfile = await this.profile.getExecutionProfile(profileName);

    for (const option of profileOptions) {
      if (this.input.options[option]) {
        executionProfile[option] = this.input.options[option] as string;
      }
    }

    for (const expect of expected || []) {
      if (executionProfile[expect] === undefined) {
        const message = await Message.create({
          header: 'Option Required',
          message: Text.create(
            "The '",
            Text.bold(expect),
            "' option must be specified as it is not specified in the profile."
          ),
          kind: MessageKind.error,
        });
        await message.write(this.input.io);
        return undefined;
      }
    }

    return executionProfile;
  }

  public async addProfile(name: string = defaultProfileName, baseUrl: string = defaultBaseUrl) {
    const issuer = generateIssuer(baseUrl);
    const subject = generateSubject();

    const newProfile = {
      baseUrl,
      issuer,
      subject,
    };

    return this.profile.addProfile(name, newProfile);
  }

  public async displayProfiles(profiles: IFlexdProfile[]) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(profiles, null, 2));
      return;
    }

    const message = await Message.create({
      header: Text.blue('Profiles'),
      message: Text.blue('Details'),
    });
    await message.write(this.input.io);

    for (const profile of profiles) {
      await this.writeProfile(profile);
    }
  }

  public async displayProfile(profile: IFlexdProfile) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(profile, null, 2));
      return;
    }

    await this.writeProfile(profile);
  }

  private async writeProfile(profile: IFlexdProfile) {
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
        Text.dim('Created:'),
        this.getDateString(new Date(profile.created)),
        Text.dim(' • '),
        Text.dim('Last Updated:'),
        this.getDateString(new Date(profile.updated)),
      ]
    );

    const message = await Message.create({
      header: Text.bold(profile.name),
      message: Text.create(details),
    });
    await message.write(this.input.io);
  }

  private getDateString(date: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateOnly = new Date(date.valueOf());
    dateOnly.setHours(0, 0, 0, 0);

    const dateOnlyMs = dateOnly.valueOf();
    const [dateString, timeString] = date.toLocaleString().split(',');
    return dateOnlyMs === today.valueOf() ? timeString : dateString;
  }

  private getProfileUpdateConfirmDetails(profile: IFlexdProfile, settings: IFlexdProfileSettings) {
    const account = profile.account || notSet;
    const subscription = profile.subscription || notSet;
    const boundary = profile.boundary || notSet;
    const func = profile.function || notSet;

    const newAccount = settings.account || notSet;
    const newSubscription = settings.subscription || notSet;
    const newBoundary = settings.boundary || notSet;
    const newFunction = settings.function || notSet;

    const accountValue =
      account === newAccount
        ? Text.create(account, Text.dim(' (no change)'))
        : Text.create(account, Text.dim(' → '), newAccount);
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
      { name: 'Account', value: accountValue },
      { name: 'Subscription', value: subscriptionValue },
      { name: 'Boundary', value: boundaryValue },
      { name: 'Function', value: functionValue },
    ];
  }

  private getProfileConfirmDetails(profile: IFlexdProfile) {
    return [
      { name: 'Deployment', value: profile.baseUrl },
      { name: 'Account', value: profile.account || notSet },
      { name: 'Subscription', value: profile.subscription || notSet },
      { name: 'Boundary', value: profile.boundary || notSet },
      { name: 'Function', value: profile.function || notSet },
    ];
  }
}
