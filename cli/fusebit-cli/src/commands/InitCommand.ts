import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ProfileService, UserService, ClientService, ExecuteService } from '../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'CLI Initialize',
  cmd: 'init',
  summary: 'Initialize the CLI',
  description: 'Initializes use of the CLI using an init token generated by an account admin.',
  arguments: [
    {
      name: 'token',
      description: 'The init token generated by an account admin',
    },
  ],
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to create with the initalization of the CLI',
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

export class InitCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new InitCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const token = input.arguments[0] as string;
    let profileName = input.options.profile as string;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    const userService = await UserService.create(input);
    const clientService = await ClientService.create(input);

    await executeService.newLine();

    const decodedToken = await userService.decodeInitToken(token);
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

    const agentService = agentId.indexOf('usr') === 0 ? userService : clientService;
    const agent = await agentService.resolveInit(baseUrl, accountId, agentId, token, initResolve);

    const newProfile = {
      baseUrl,
      account: accountId,
      subscription: subscriptionId,
      boundary: boundaryId,
      function: functionId,
      agent: agentId,
      issuer: issuerId,
      subject: subject,
    };

    await profileService.addProfile(profileName, newProfile, keyPair);

    const defaultProfileName = await profileService.getDefaultProfileName();
    if (!defaultProfileName) {
      await profileService.setDefaultProfileName(profileName);
    }

    await agentService.initSuccess(profileName, agent);

    return 0;
  }
}
