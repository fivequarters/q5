import { Command, IExecuteInput } from '@5qtrs/cli';
import { BackupService } from '../../services';

const command = {
  name: 'List Backup Plans',
  cmd: 'ls',
  summary: 'List Backup Plans',
  description: 'List Backup Plans/Schedules in the Fusebit platform',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
    {
      name: 'region',
      description: "The region in which you want to list your backups"
    },
  ],
};

export class ListBackupCommand extends Command {
  public static async create() {
    return new ListBackupCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<any> {
    await input.io.writeLine();
    const output = input.options.output as string;
    const region = input.options.region as string;
    const backupService = await BackupService.create(input);
    if (output === 'json') {
      const backupPlans = await backupService.listBackupPlan();
      await backupService.displayBackupPlans(backupPlans);
    }
  }
}
