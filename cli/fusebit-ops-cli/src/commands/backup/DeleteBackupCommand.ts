import { Command, IExecuteInput } from '@5qtrs/cli';
import { BackupService } from '../../services';

const command = {
  name: 'Delete Backup Plans',
  cmd: 'rm',
  summary: 'Delete Backup Plans',
  description: 'List Backup Plans/Schedules in the Fusebit platform',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
    {
      name: 'name',
      description: 'The name of the backup plans',
    },
  ],
};

export class DeleteBackupCommand extends Command {
  public static async create() {
    return new DeleteBackupCommand();
  }

  private constructor() {
    super(command);
  }

  // handles the backup delete commands
  protected async onExecute(input: IExecuteInput): Promise<any> {
    await input.io.writeLine();
    const output = input.options.output as string;
    const name = input.options.name as string;
    const backupService = await BackupService.create(input);
    if (output === 'json') {
      const backupPlans = await backupService.deleteBackupPlan(name).then(() => {
        input.io.writeLine(JSON.stringify({ status: 'success' }));
      });
    } else {
      await backupService.deleteBackupPlan(name).then(() => {
        input.io.writeLine('success');
      });
    }
  }
}
