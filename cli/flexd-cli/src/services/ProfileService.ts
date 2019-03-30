import { Message, MessageKind, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { FlexdProfile, IFlexdExecutionProfile } from '@5qtrs/flexd-profile';
import { random } from '@5qtrs/random';

// ------------------
// Internal Constants
// ------------------

const defaultBaseUrl = 'api.flexd.io';
const defaultProfileName = 'default';
const profileOptions = ['account', 'subscription', 'boundary', 'function'];

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

  public async getExecutionProfile(expected?: string[]): Promise<IFlexdExecutionProfile> {
    // TODO randall, remove this after we have end to end user and profile support
    if (process.env.API_AUTHORIZATION_KEY) {
      return {
        account: (this.input.options.account as string) || '12345',
        subscription: (this.input.options.subscription as string) || '12345',
        boundary: this.input.options.boundary as string,
        function: this.input.options.function as string,
        baseUrl: process.env.API_SERVER || 'https://stage.flexd.io',
        // baseUrl: 'http://localhost:3001',
        token: process.env.API_AUTHORIZATION_KEY,
      };
    }
    // end of TODO
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

    console.log('addProfile - ProfileService');
    return this.profile.addProfile(name, newProfile);
  }
}
