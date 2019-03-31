import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ExecuteService, ProfileService } from '../../services';

export class ProfileRemoveCommand extends Command {
  private constructor() {
    super({
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
          name: 'confirm',
          aliases: ['c'],
          description: 'If set to true, prompts for confirmation before removing the profile',
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new ProfileRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    const profile = await profileService.getProfile(name);
    if (!profile) {
      return 1;
    }

    if (confirm) {
      const confirmed = await profileService.confirmRemoveProfile(name, profile);
      if (!confirmed) {
        return 1;
      }
    }

    const removedOk = await profileService.removeProfile(name);
    if (!removedOk) {
      await executeService.verbose();
      return 1;
    }

    await executeService.result({
      header: 'Profile Removed',
      message: Text.create("The '", Text.bold(name), "' profile was successfully removed"),
    });

    return 0;
  }
}
