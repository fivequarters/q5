import { Command, IExecuteInput } from '@5qtrs/cli';
import { RestoreService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Restore Points',
  cmd: 'ls',
  summary: 'List restore points for a certain deployment',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
    {
      name: 'deployment-name',
      description: 'the name of the deployment you want to see restore points for',
    },
    {
      name: 'backup-plan-name',
      description: 'the name of the backup plan you want to see restore points for',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ListRestoreCommand extends Command {
  public static async create() {
    return new ListRestoreCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const restoreService = await RestoreService.create(input);
    const restorePoints = await restoreService.listRestorePoints(
      input.options['backup-plan-name'] as string,
      input.options['deployment-name'] as string
    );
    
    return 0;
  }
}
