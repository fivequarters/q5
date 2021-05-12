import { Command, IExecuteInput } from '@5qtrs/cli';
import { BackupService } from '../../services';

const command = {
  name: 'Get Backup Plan',
  cmd: 'get',
  summary: 'Get a backup plan',
  description: 'Retrieve the details of a backup plan on the Fusebit platform',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output; 'pretty', 'json'",
      default: 'pretty',
    },
    {
      name: 'name',
      aliases: ['n'],
      description: 'The name of the backup plan (an UUID)',
    },
  ],
};

export class GetBackupCommand extends Command {
  public static async create() {
    return new GetBackupCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<any> {
    await input.io.writeLine();
    const backupPlanName = input.options.name as string;
    const backupService = await BackupService.create(input);
    const backupPlan = await backupService.getBackupPlan(backupPlanName);
    await backupService.displayGetBackupPlan(backupPlan);
  }
}
