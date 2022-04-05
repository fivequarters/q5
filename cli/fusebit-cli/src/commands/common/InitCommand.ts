import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ProfileService, ExecuteService, AgentService } from '../../services';
import {
  isIFusebitOauthInitToken,
  isIFusebitPKIInitToken,
  IFusebitLegacyPKIInitToken,
  IFusebitPKIInitToken,
  IFusebitOauthInitToken,
  IFusebitInitResolve,
} from '../../services/AgentService';
import { IOAuthFusebitProfile, IFusebitProfile, IFusebitKeyPair, FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

// ------------------
// Internal Constants
// ------------------

const command = {
  skipBuiltInProfile: true,
  name: 'CLI Initialize',
  cmd: 'init',
  summary: 'Initialize the CLI',
  description:
    'Initializes use of the CLI using an init token generated by an account admin or a hosted settings object.',
  arguments: [
    {
      name: 'token',
      description:
        'The name of the built-in profile, an init token generated by an account admin, a URL to Fusebit settings object, or a Github repository name with the Fusebit settings file',
      default: FusebitProfile.defaultProfileId,
    },
  ],
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to create with the initalization of the CLI',
    },
    {
      name: 'subscription',
      aliases: ['s'],
      description: 'Set the subscription command option of the profile to the given subscription',
    },
    {
      name: 'quiet',
      aliases: ['q'],
      description: 'If set to true, does not prompt for confirmation',
      type: ArgType.boolean,
      default: 'false',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export interface IInitOptions {
  prettyPrint?: boolean;
  command?: {
    description: string;
    arguments: any[];
    options: any[];
  };
}

export class InitCommand extends Command {
  protected initOptions: IInitOptions;

  private constructor(options: IInitOptions) {
    super({ ...command, ...options?.command });
    this.initOptions = options;
  }

  public static async create(options: IInitOptions) {
    return new InitCommand(options);
  }

  public static async createDefaultProfileIfNoneExists(input: IExecuteInput): Promise<void> {
    const profileName = input.options.profile as string;
    const profileService = await ProfileService.create(input);
    await profileService.execute(async () => {
      // Remove any uncompleted profile
      await profileService.removeUncompletedProfiles();
      const profiles = await profileService.listProfiles();
      if (profiles.length === 0) {
        await profileService.createDefaultProfile(profileName, FusebitProfile.defaultProfileId);
      }
    });
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    let token = input.arguments[0] as string;
    let profileName = input.options.profile as string;
    const quiet = input.options.quiet as boolean;
    const subscription = input.options.subscription as string;

    const initOptions = this.initOptions;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    let agentService = await AgentService.create(input);

    await executeService.newLine();

    if (FusebitProfile.defaultProfiles[token]) {
      if (FusebitProfile.defaultProfiles[token].synthetic) {
        // The init token is the name of one of the built-in profiles
        await profileService.createDefaultProfile(profileName, token);
        return 0;
      }
      if (FusebitProfile.defaultProfiles[token].provisionUrl) {
        await executeService.message('Initializing', Text.create('Initializing a new profile...'));
        token = await profileService.execute(() =>
          profileService.fetchProvisionToken(FusebitProfile.defaultProfiles[token].provisionUrl)
        );
      }
    }

    if (token.match(/^https:\/\//i)) {
      // The init token is a URL to the OAuth Device flow profile settings object
      await profileService.execute(async () => initFromUrl(token, token));
      return 0;
    }

    const [path, sourceProfile] = token.split('#');
    const [organization, repository, file, rest] = path.split('/');
    if (organization && repository && !rest) {
      // The init token is a shorhand representation of a file in a public github repo that contains
      // OAuth Device Flow profile settings object
      await profileService.execute(async () =>
        initFromUrl(
          `https://raw.githubusercontent.com/${organization}/${repository}/master/${file || 'profiles.json'}${
            sourceProfile ? '#' + sourceProfile : ''
          }`,
          token
        )
      );
      return 0;
    }

    const decodedToken = await agentService.decodeInitToken(token);
    if (isIFusebitOauthInitToken(decodedToken)) {
      // The init token contains OAuth decice flow profile
      await initFromOauthToken(decodedToken);
    } else if (isIFusebitPKIInitToken(decodedToken)) {
      // The init token contains PKI flow profile
      await initFromPKIToken(decodedToken);
    } else {
      // The init token contains Legacy PKI issuer and subject
      await initFromLegacyPKIToken(decodedToken);
    }

    return 0;

    async function initFromUrl(url: string, srcUrl: string): Promise<void> {
      const [serverUrl, sourceProfile] = url.split('#');
      const settingsResponse = await executeService.executeSimpleRequest(
        {
          header: 'Settings',
          message: Text.create('Obtaining Fusebit profiles from ', Text.bold(serverUrl), '...'),
          errorHeader: 'Settings Error',
          errorMessage: Text.create('Unable to obtain Fusebit settings'),
        },
        {
          method: 'GET',
          url: serverUrl,
        }
      );
      if (settingsResponse.status !== 200) {
        throw new Error(`Error obtaining Fusebit settings. HTTP status: ${settingsResponse.status}.`);
      }
      let settings: any = settingsResponse.data;
      if (typeof settings !== 'object') {
        try {
          settings = JSON.parse(settings);
        } catch (e) {
          throw new Error(`Error obtaining Fusebit settings: data is not a JSON object.`);
        }
      }
      if (!Array.isArray(settings.profiles) || settings.profiles.length === 0) {
        throw new Error(`Invalid Fusebit settings: data does not specify any profile information.`);
      }
      let profile: any;
      if (sourceProfile) {
        for (const p of settings.profiles) {
          if (sourceProfile === p.id) {
            profile = p;
            break;
          }
        }
      }
      if (!profile) {
        if (settings.profiles.length > 1) {
          throw new Error(
            `Fusebit settings contain more than one profile. Select a profile to use by specifying it as a hash value, i.e. '${token}#{profile-name}'. Available profiles are: ${settings.profiles
              .map((p: any) => p.id)
              .join(', ')}.`
          );
        }
        profile = settings.profiles[0];
      }
      if (!profileName) {
        profileName = await profileService.getProfileNameFromBaseUrl(profile.baseUrl);
      }

      const addedProfile = await addOauthProfile(profile);

      const agent = await profileService.getAgent(profileName);
      const agentDetails = await agentService.getAgentDetails(agent, true);
      await profileService.displayProfile(addedProfile, agentDetails);
    }

    async function initFromOauthToken(decodedToken: IFusebitOauthInitToken): Promise<void> {
      profileName = await profileService.execute(async () => {
        if (profileName) {
          decodedToken.profile.id = profileName;
        }
        if (decodedToken.profile.id) return decodedToken.profile.id;
        throw new Error(
          'The init token does not specify a profile name. You must specify it explicitly using the --profile option.'
        );
      });
      const addedProfile = await addOauthProfile(decodedToken.profile);
      const executionProfile = await profileService.getNamedExecutionProfile(profileName);

      const initResolve = {
        protocol: 'oauth',
        accessToken: executionProfile.accessToken,
      };

      try {
        const agent = await agentService.resolveInit(
          executionProfile.baseUrl,
          executionProfile.account,
          decodedToken.agentId,
          token,
          initResolve as IFusebitInitResolve
        );

        const agentDetails = await agentService.getAgentDetails(agent, true);

        if (initOptions.prettyPrint) {
          await profileService.displayPrettyProfile(addedProfile);
        } else {
          await profileService.displayProfile(addedProfile, agentDetails);
        }
      } catch (e) {
        await profileService.removeProfile(profileName);
        throw e;
      }
    }

    async function initFromPKIToken(decodedToken: IFusebitPKIInitToken): Promise<void> {
      profileName = await profileService.execute(async () => {
        if (profileName) {
          decodedToken.profile.id = profileName;
        }
        if (decodedToken.profile.id) return decodedToken.profile.id;
        throw new Error(
          'The init token does not specify a profile name. You must specify it explicitly using the --profile option.'
        );
      });

      const keyPair = await profileService.generateKeyPair(profileName);

      const addedProfile = await addPKIProfile(decodedToken.profile, keyPair);
      const executionProfile = await profileService.getNamedExecutionProfile(profileName);

      const initResolve = {
        protocol: 'pki',
        accessToken: executionProfile.accessToken,
        publicKey: keyPair.publicKey,
      };

      try {
        const agent = await agentService.resolveInit(
          executionProfile.baseUrl,
          executionProfile.account,
          decodedToken.agentId,
          token,
          initResolve as IFusebitInitResolve
        );
        if (input.options.verbose) {
          console.log('RESOLVED AGENT', agent);
        }

        const agentDetails = await agentService.getAgentDetails(agent, true);
        if (input.options.verbose) {
          console.log('AGENT DETAILS', agentDetails);
        }
        if (initOptions.prettyPrint) {
          await profileService.displayPrettyProfile(addedProfile);
        } else {
          await profileService.displayProfile(addedProfile, agentDetails);
        }
      } catch (e) {
        if (input.options.verbose) {
          console.log('INIT ERROR', e);
        }
        await profileService.removeProfile(profileName);
        throw e;
      }
    }

    async function addOauthProfile(profile: any): Promise<IOAuthFusebitProfile> {
      if (!quiet) {
        const targetProfile = await profileService.getProfile(profileName);
        if (targetProfile) {
          await profileService.confirmCreateProfile(profileName, targetProfile);
        }
      }

      const newCliProfile: any = {
        baseUrl: profile.baseUrl,
        account: profile.account,
        issuer: profile.oauth && profile.oauth.deviceAuthorizationUrl,
        tokenUrl: profile.oauth && profile.oauth.tokenUrl,
        clientId: profile.oauth && profile.oauth.deviceClientId,
        subscription: subscription === '' ? undefined : subscription || profile.subscription,
        boundary: profile.boundary || undefined,
        function: profile.function || undefined,
      };
      const nameMapping: any = {
        baseUrl: 'baseUrl',
        account: 'account',
        issuer: 'oauth.deviceAuthorizationUrl',
        tokenUrl: 'oauth.tokenUrl',
        clientId: 'oauth.deviceClientId',
      };

      await profileService.execute(async () => {
        for (const p of Object.keys(newCliProfile)) {
          if (['subscription', 'boundary', 'function'].indexOf(p) < 0 && typeof newCliProfile[p] !== 'string') {
            throw new Error(
              `Invalid Fusebit settings: the '${nameMapping[p]}' parameter of the '${profileName}' profile must be a string.`
            );
          }
        }
      });

      const addedProfile = await profileService.createProfile(profileName, newCliProfile);

      const defaultProfileName = await profileService.getDefaultProfileName();
      if (!defaultProfileName) {
        await profileService.setDefaultProfileName(profileName);
      }

      return addedProfile;
    }

    async function addPKIProfile(profile: any, keyPair: IFusebitKeyPair): Promise<IFusebitProfile> {
      if (!quiet) {
        const targetProfile = await profileService.getProfile(profileName);
        if (targetProfile) {
          await profileService.confirmCreateProfile(profileName, targetProfile);
        }
      }

      const newCliProfile: any = {
        name: profileName,
        baseUrl: profile.baseUrl,
        account: profile.account,
        issuer: profile.issuerId,
        subject: profile.subject,
        subscription: subscription === '' ? undefined : subscription || profile.subscription,
        boundary: profile.boundary || undefined,
        function: profile.function || undefined,
      };
      const nameMapping: any = {
        baseUrl: 'baseUrl',
        account: 'account',
        issuer: 'issuerId',
        subject: 'subject',
      };

      await profileService.execute(async () => {
        for (const p of Object.keys(newCliProfile)) {
          if (['subscription', 'boundary', 'function'].indexOf(p) < 0 && typeof newCliProfile[p] !== 'string') {
            throw new Error(
              `Invalid Fusebit settings: the '${nameMapping[p]}' parameter of the '${profileName}' profile must be a string.`
            );
          }
        }
      });

      await profileService.initProfile(profileName, newCliProfile, keyPair);

      const defaultProfileName = await profileService.getDefaultProfileName();
      if (!defaultProfileName) {
        await profileService.setDefaultProfileName(profileName);
      }

      return await profileService.getProfileOrThrow(profileName);
    }

    async function initFromLegacyPKIToken(decodedToken: IFusebitLegacyPKIInitToken): Promise<void> {
      const { accountId, subscriptionId, boundaryId, functionId, agentId, baseUrl, issuerId, subject } = decodedToken;

      if (!profileName) {
        profileName = await profileService.getProfileNameFromBaseUrl(baseUrl);
      }

      const existing = await profileService.getProfile(profileName);
      if (existing) {
        await profileService.confirmInitProfile(profileName, existing);
      }

      const keyPair = await profileService.generateKeyPair(profileName);

      const initResolve = {
        publicKey: keyPair.publicKey,
        keyId: keyPair.kid,
      };

      if (agentId.indexOf('usr') !== 0) {
        agentService = await AgentService.create(input, false);
      }

      const agent = await agentService.resolveInit(baseUrl, accountId, agentId, token, initResolve);

      const newProfile = {
        baseUrl,
        account: accountId,
        subscription: subscription === '' ? undefined : subscription || subscriptionId,
        boundary: boundaryId,
        function: functionId,
        agent: agentId,
        issuer: issuerId,
        subject: subject,
      };

      await profileService.initProfile(profileName, newProfile, keyPair);

      const defaultProfileName = await profileService.getDefaultProfileName();
      if (!defaultProfileName) {
        await profileService.setDefaultProfileName(profileName);
      }

      await agentService.initSuccess(profileName, agent);
    }
  }
}
