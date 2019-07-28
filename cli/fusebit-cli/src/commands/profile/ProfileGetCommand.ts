import { Command, IExecuteInput } from '@5qtrs/cli';
import { ProfileService, ExecuteService, AgentService } from '../../services';

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
    const agent = await profileService.getAgent(profile.name);
    const agentDetails = await agentService.getAgentDetails(agent, true);
    await profileService.displayProfile(profile, agentDetails);

    return 0;
  }
}
