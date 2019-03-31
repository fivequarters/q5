import { Command, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ExecuteService, ProfileService } from '../../services';

export class ProfileDefaultCommand extends Command {
  private constructor() {
    super({
      name: 'Set Default Profile',
      cmd: 'default',
      summary: 'Get or set the default profile',
      description: Text.create(
        "Returns the current default profile if the '",
        Text.bold('name'),
        "' argument is not specified. Sets the stored default profile if the '",
        Text.bold('name'),
        "' argument is not specified."
      ),
      arguments: [
        {
          name: 'name',
          description: 'The name of the profile to use as the default',
          required: false,
        },
      ],
    });
  }

  public static async create() {
    return new ProfileDefaultCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name] = input.arguments as string[];

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    if (!name) {
      const defaultProfile = await profileService.getProfile();
      if (!defaultProfile) {
        executeService.verbose();
        return 1;
      }
      await profileService.displayProfile(defaultProfile);
      return 0;
    }

    const newDefaultProfile = await profileService.getProfile(name);
    if (!newDefaultProfile) {
      executeService.verbose();
      return 1;
    }

    const setOk = await profileService.setDefaultProfile(name);
    if (!setOk) {
      executeService.verbose();
      return 1;
    }

    await executeService.result({
      header: 'Profile set',
      message: Text.create("The '", Text.bold(name), "' profile was successfully set as the default profile"),
    });

    await profileService.displayProfile(newDefaultProfile);
    return 0;
  }
}
