import { IExecuteInput, ICommandIO, Message, MessageKind } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { AwsCreds } from '@5qtrs/aws-cred';
import { FusebitOpsDotConfig } from '../FusebitOpsDotConfig';

// ------------------
// Internal Functions
// ------------------

function getMfaCodeResolver(io: ICommandIO) {
  return async (accountId: string) => {
    const message = await Message.create({
      header: 'Auth Required',
      message: Text.create(
        "Access to AWS account '",
        Text.bold(accountId),
        "' is required to continue executing the current command."
      ),
      kind: MessageKind.info,
    });

    await message.write(io);

    let mfaCode = '';
    while (!mfaCode) {
      const promptOptions = {
        prompt: 'MFA code:',
        placeholder: '(Required)',
        required: true,
      };
      mfaCode = await io.prompt(promptOptions);
    }

    const message2 = await Message.create({
      header: 'Auth',
      message: 'Authenticating with AWS...',
      kind: MessageKind.info,
    });

    await message2.write(io);
    io.spin(true);

    return { code: mfaCode };
  };
}

// -------------------
// Exported Interfaces
// -------------------

// ----------------
// Exported Classes
// ----------------

export class AwsCredsService {
  private input: IExecuteInput;
  private dotConfig: FusebitOpsDotConfig;
  private userCreds?: AwsCreds;

  private constructor(input: IExecuteInput, dotConfig: FusebitOpsDotConfig) {
    this.input = input;
    this.dotConfig = dotConfig;
  }

  public static async create(input: IExecuteInput) {
    const dotConfig = await FusebitOpsDotConfig.create();
    return new AwsCredsService(input, dotConfig);
  }

  public async getUserCreds() {
    if (!this.userCreds) {
      const user = await this.dotConfig.getUser();
      const userAccount = await this.dotConfig.getUserAccount();
      const userCredOptions = {
        account: userAccount,
        accessKeyId: user.accessKeyId,
        secretAccessKey: user.secretAccessKey,
        userName: user.userName,
        useMfa: true,
        mfaCodeResolver: getMfaCodeResolver(this.input.io),
      };
      const credsCache = this.getCredsCache();
      this.userCreds = await AwsCreds.create(userCredOptions, credsCache);
    }

    return this.userCreds;
  }

  private getCredsCache() {
    const set = async (key: string, creds: string) => {
      return this.dotConfig.setCachedCreds(key, creds);
    };
    const get = async (key: string) => {
      return this.dotConfig.getCachedCreds(key);
    };

    return { get, set };
  }
}
