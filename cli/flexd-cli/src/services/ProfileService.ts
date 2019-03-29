import { Message, MessageKind, IExecuteInput } from '@5qtrs/cli';
import { IText } from '@5qtrs/text';
import { FlexdProfile, IFlexdProfile, IFlexdExecutionProfile } from '@5qtrs/flexd-profile';
import { random } from '@5qtrs/random';

// ------------------
// Internal Constants
// ------------------

const defaultBaseUrl = 'api.flexd.io';
const defaultProfileName = 'default';

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

  private constructor(profile: FlexdProfile, input: IExecuteInput) {
    this.input = input;
    this.profile = profile;
  }

  public static async create(input: IExecuteInput) {
    const flexdProfile = await FlexdProfile.create();
    return new ProfileService(flexdProfile, input);
  }

  public async getExecutionProfile(): Promise<IFlexdExecutionProfile> {
    const profileName = this.input.options.profile as string;
    const executionProfile = await this.profile.getExecutionProfile(profileName);
    if (this.input.options.account) {
      executionProfile.accountId = this.input.options.account as string;
    }
    if (this.input.options.subscription) {
      executionProfile.subscriptionId = this.input.options.subscription as string;
    }
    if (this.input.options.boundary) {
      executionProfile.boundaryId = this.input.options.boundary as string;
    }
    if (this.input.options.function) {
      executionProfile.functionId = this.input.options.function as string;
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

    console.log('addProfile - ProfileService');
    return this.profile.addProfile(name, newProfile);
  }
}
