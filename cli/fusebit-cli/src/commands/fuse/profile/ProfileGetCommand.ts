import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ProfileService, ExecuteService, AgentService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Profile Details',
  cmd: 'get',
  summary: 'Get the details of a profile',
  description: [
    'Gets a given profile, including the details of the user or client',
    'that the profile is based upon.',
  ].join(' '),
  arguments: [
    {
      name: 'name',
      description: 'The name of the profile to get the details of',
      required: false,
      defaultText: 'current profile',
    },
  ],
  options: [
    {
      name: 'includeCredentials',
      aliases: ['c'],
      description:
        'If set to true, and --output is set to json or json64, includes private credential information in the output',
      type: ArgType.boolean,
      default: 'false',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json', 'json64'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ProfileGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const profileName = input.arguments[0] as string;
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    const agentService = await AgentService.create(input);

    await executeService.newLine();

    const profile = await profileService.getProfileOrDefaultOrThrow(profileName);
    if (input.options.output === 'json' || input.options.output === 'json64') {
      const pki = input.options.includeCredentials
        ? await profileService.getExportProfileDemux(profileName)
        : undefined;
      const result: any = {
        id: profile.name,
        displayName: profile.name,
        baseUrl: profile.baseUrl,
      };
      ['account', 'subscription', 'boundary', 'function'].forEach((p) => {
        if (profile[p]) {
          result[p] = profile[p];
        }
      });
      if (profile.clientId && profile.tokenUrl) {
        // OAuth
        result.type = 'oauth';
        result.oauth = {
          deviceAuthorizationUrl: profile.issuer,
          deviceClientId: profile.clientId,
          tokenUrl: profile.tokenUrl,
        };
      } else {
        // PKI
        result.type = 'pki';
        result.pki = {
          issuer: profile.issuer,
          subject: profile.subject,
          kid: profile.kid,
          ...(pki || {}),
        };
      }
      if (input.options.output === 'json') {
        await input.io.writeLineRaw(JSON.stringify(result, null, 2));
      } else {
        await input.io.writeLineRaw(Buffer.from(JSON.stringify(result), 'utf8').toString('base64'));
      }
    } else {
      const agent = await profileService.getAgent(profile.name);
      const agentDetails = await agentService.getAgentDetails(agent, true);
      await profileService.displayProfile(profile, agentDetails);
    }

    return 0;
  }
}
