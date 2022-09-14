import { Command, IExecuteInput } from '@5qtrs/cli';
import { ProfileService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Export Profile as JSON',
  cmd: 'export',
  summary: 'Fully export a profile',
  description: [
    'Fully export a profile to the console as JSON, including PKI keying material, so that the profile can be',
    'relocated to other environments, such as CICD.',
  ].join(' '),
  arguments: [
    {
      name: 'name',
      description: 'The name of the profile to export',
      required: COMMAND_MODE === 'EveryAuth' ? false : true,
    },
  ],
  options: [],
};

// ----------------
// Exported Classes
// ----------------

export class ProfileExportCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileExportCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const profileName = input.arguments[0] as string;
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const profile = await profileService.getProfileOrDefaultOrThrow(profileName);
    const pki = await profileService.getExportProfileDemux(profileName);

    if (!pki) {
      throw new Error('Unable to export non-pki profiles');
    }

    const result = {
      profile,
      type: 'pki',
      pki: {
        name: profile.name,
        ...pki,
      },
    };
    await input.io.writeLineRaw(JSON.stringify(result, null, 2));

    return 0;
  }
}
