import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ProfileService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Profile',
  cmd: 'rm',
  summary: 'Remove a profile',
  description: 'Removes a stored profile.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the profile to remove',
    },
  ],
  options: [
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

export class ProfileRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [name] = input.arguments as string[];

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const profile = await profileService.getProfileOrThrow(name);

    await profileService.confirmRemoveProfile(name, profile);
    await profileService.removeProfile(name);

    return 0;
  }
}
