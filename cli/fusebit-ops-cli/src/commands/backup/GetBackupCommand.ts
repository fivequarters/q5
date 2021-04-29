import { Command, IExecuteInput } from '@5qtrs/cli';
import { BackupService } from '../../services';

const command = {
  name: 'Get Backup Plan',
  cmd: 'get',
  summary: 'Get a backup plan',
  description: 'Retrive the details of a backup plan in the Fusebit platform',
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
      description: 'the name of the backup plan (an UUID)',
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

  // handles the backup get command
  protected async onExecute(input: IExecuteInput): Promise<any> {
    await input.io.writeLine();
    const output = input.options.output as string;
    const region = input.options.region as string;
    const backupPlanName = input.options.name as string;
    const backupService = await BackupService.create(input);
    if (output === 'json') {
      const backupPlan = await backupService.getBackupPlan(backupPlanName);
      await backupService.displayGetBackupPlans(backupPlan);
    } else {
      const backupPlan = await backupService.getBackupPlan(backupPlanName);
    }
  }
}
