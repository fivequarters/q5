import { Command, IExecuteInput } from '@5qtrs/cli';
import { BackupService } from '../../services';

const command = {
  name: 'Delete Backup Plans',
  cmd: 'rm',
  summary: 'Delete Backup Plans',
  description: 'Deletes backup plan in the Fusebit platform.',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
    {
      name: 'name',
      description: 'The name of the backup plan',
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
        input.io.writeLine(`successfully deleted backup plan ${name}`);
      });
    }
  }
}
