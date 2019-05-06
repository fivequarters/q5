import { Command, ICommand, IExecuteInput, ArgType } from '@5qtrs/cli';
import { SetupService } from '../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Fusebit Platform Setup',
  cmd: 'setup',
  summary: 'Sets up the Fusebit platform',
  description: 'Sets up the Fusebit platform on the main AWS account.',
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use',
      defaultText: 'default profile',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before setting up the Fusebit platform',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class SetupCommand extends Command {
  public static async create() {
    return new SetupCommand(command);
  }

  private constructor(commnd: ICommand) {
    super(commnd);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const confirm = input.options.confirm as boolean;

    const setupService = await SetupService.create(input);

    const isSetup = await setupService.isSetup();
    if (isSetup) {
      await setupService.alreadySetup();
      return 0;
    }

    if (confirm) {
      await setupService.confirmSetup();
    }

    await setupService.setup();

    return 0;
  }
}
