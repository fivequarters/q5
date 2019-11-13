import { IExecuteInput, ICommandIO, Message, MessageKind } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { AwsCreds } from '@5qtrs/aws-cred';
import { Config } from '@5qtrs/config';
import { IOpsDataContext } from '@5qtrs/ops-data';
import { OpsDataAwsContextFactory } from '@5qtrs/ops-data-aws';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';

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

// ----------------
// Exported Classes
// ----------------

export class OpsService {
  private input: IExecuteInput;
  private profileService: ProfileService;
  private executeService: ExecuteService;
  private userCreds?: AwsCreds;
  private opsDataContext?: IOpsDataContext;

  private constructor(input: IExecuteInput, profileService: ProfileService, executeService: ExecuteService) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    return new OpsService(input, profileService, executeService);
  }

  public async getUserCreds(): Promise<AwsCreds> {
    if (!this.userCreds) {
      const profile = await this.profileService.getProfileOrDefaultOrThrow(this.input.options.profile as string);
      const userCredOptions = profile.credentialsProvider
        ? {
            account: profile.awsUserAccount || profile.awsMainAccount,
            credentialsProvider: profile.credentialsProvider,
          }
        : {
            account: profile.awsUserAccount || profile.awsMainAccount,
            accessKeyId: profile.awsAccessKeyId,
            secretAccessKey: profile.awsSecretAccessKey,
            userName: profile.awsUserName,
            useMfa: profile.awsUserAccount !== undefined,
            mfaCodeResolver: getMfaCodeResolver(this.input.io),
          };
      const credsCache = this.getCredsCache(profile.name);
      this.userCreds = await AwsCreds.create(userCredOptions, credsCache);
    }

    return this.userCreds;
  }

  public async getOpsDataContext(): Promise<IOpsDataContext> {
    if (!this.opsDataContext) {
      const profile = await this.profileService.getProfileOrDefaultOrThrow();
      const awsCreds = await this.getUserCreds();
      const func = async () => {
        const factory = await OpsDataAwsContextFactory.create(awsCreds);
        const config = new Config(
          profile.credentialsProvider
            ? {
                // userAccountEnabled: false,
                mainAccountId: profile.awsMainAccount,
                // mainAccountRole: undefined,
                credentialsProvider: profile.credentialsProvider,
              }
            : {
                userAccountEnabled: profile.awsUserAccount !== undefined,
                mainAccountId: profile.awsMainAccount,
                mainAccountRole: profile.awsMainRole || undefined,
              }
        );
        return factory.create(config);
      };
      this.opsDataContext = (await this.executeService.execute({ errorHeader: 'Ops Error' }, func)) as IOpsDataContext;
    }
    return this.opsDataContext;
  }

  private getCredsCache(profileName: string) {
    const set = async (key: string, creds: string) => {
      return this.profileService.setCachedCreds(profileName, key, creds);
    };
    const get = async (key: string) => {
      return this.profileService.getCachedCreds(profileName, key);
    };

    return { get, set };
  }
}
