import { IExecuteInput, ICommandIO, Message, MessageKind } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { AwsCreds } from '@5qtrs/aws-cred';
import { Config, IConfigSettings } from '@5qtrs/config';
import { IOpsDataContext } from '@5qtrs/ops-data';
import { OpsDataAwsContextFactory, OpsDataAwsContext } from '@5qtrs/ops-data-aws';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';
import { IFusebitOpsProfile } from '@5qtrs/fusebit-ops-profile-sdk';
import * as cliAddonSlack from '../services/SlackPluginService';
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
  private opsDataContext?: OpsDataAwsContext;

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

  public async getUserCredsForProfile(profile: IFusebitOpsProfile): Promise<AwsCreds> {
    const userCredOptions = profile.credentialsProvider
      ? {
          account: profile.awsUserAccount || profile.awsMainAccount,
          credentialsProvider: profile.credentialsProvider,
          govCloud: profile.govCloud,
        }
      : {
          account: profile.awsUserAccount || profile.awsMainAccount,
          accessKeyId: profile.awsAccessKeyId,
          secretAccessKey: profile.awsSecretAccessKey,
          userName: profile.awsUserName,
          useMfa: profile.awsUserAccount !== undefined,
          mfaCodeResolver: getMfaCodeResolver(this.input.io),
          govCloud: profile.govCloud,
        };

    const credsCache = this.getCredsCache(profile.name);
    const creds = await AwsCreds.create(userCredOptions, credsCache);

    return creds;
  }

  public async getOpsDataContextImpl(settings?: IConfigSettings): Promise<OpsDataAwsContext> {
    if (!this.opsDataContext) {
      const profile = await this.profileService.getProfileOrDefaultOrThrow();
      let globalOpsDataAwsContext: OpsDataAwsContext | undefined = undefined;
      if (profile.govCloud) {
        const globalProfile = await this.profileService.getProfileOrThrow(profile.globalProfile as string);
        globalOpsDataAwsContext = await this.getOpsDataContextForProfile(globalProfile, settings);
      }
      this.opsDataContext = await this.getOpsDataContextForProfile(profile, settings, globalOpsDataAwsContext);
    }

    const config = await this.opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();

    if (await cliAddonSlack.isSetup(config.account)) {
      const awsIdentity = await cliAddonSlack.getAwsIdentity(credentials);
      const [, , ...command] = process.argv;
      await cliAddonSlack.startExecution(command.join(' '), awsIdentity);
    }

    return this.opsDataContext;
  }

  public async getOpsDataContext(settings?: IConfigSettings): Promise<IOpsDataContext> {
    return (await this.getOpsDataContextImpl()) as IOpsDataContext;
  }

  private async getOpsDataContextForProfile(
    profile: IFusebitOpsProfile,
    settings?: IConfigSettings,
    globalOpsDataAwsContext?: OpsDataAwsContext
  ): Promise<OpsDataAwsContext> {
    const awsCreds = await this.getUserCredsForProfile(profile);
    const func = async () => {
      const factory = await OpsDataAwsContextFactory.create(awsCreds, globalOpsDataAwsContext);
      const config = new Config(
        profile.credentialsProvider
          ? {
              // userAccountEnabled: false,
              mainAccountId: profile.awsMainAccount,
              // mainAccountRole: undefined,
              credentialsProvider: profile.credentialsProvider,
              govCloud: profile.govCloud || false,
              ...settings,
            }
          : {
              userAccountEnabled: profile.awsUserAccount !== undefined,
              mainAccountId: profile.awsMainAccount,
              mainAccountRole: profile.awsMainRole || undefined,
              govCloud: profile.govCloud || false,
              ...settings,
            }
      );
      return factory.create(config);
    };
    return (await this.executeService.execute({ errorHeader: 'Ops Error' }, func)) as OpsDataAwsContext;
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
