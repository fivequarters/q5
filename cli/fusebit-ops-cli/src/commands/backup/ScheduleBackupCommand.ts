import { Command, IExecuteInput } from '@5qtrs/cli';
import { BackupService } from '../../services';

const command = {
  name: 'Create Backup Plan',
  cmd: 'schedule',
  description: 'Create backup backup plans for the Fusebit platform',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
    {
      name: 'schedule',
      description: 'The cron schedule of the backup',
    },
    {
      name: 'name',
      description: 'The friendly name of the backup',
    },
    {
      name: 'sns-topic-arn',
      description: 'The ARN of the SNS topic to publish to when a backup is done',
      default: undefined,
    },
  ],
};

export class ScheduleBackupCommand extends Command {
  public static async create() {
    return new ScheduleBackupCommand();
  }
  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<any> {
    await input.io.writeLine();
    const output = input.options.output as string;
    const schedule = input.options.schedule as string;
    const name = input.options.name as string;
    const snsTopicArn = input.options['sns-topic-arn'] as string | undefined;
    const backupService = await BackupService.create(input);
    if (output === 'json') {
      await backupService.createBackupPlan(name, schedule, snsTopicArn).then(() => {
        input.io.writeLine(JSON.stringify({ status: 'success' }));
      });
    } else {
      await backupService.createBackupPlan(name, schedule, snsTopicArn).then(() => {
        input.io.writeLine('success');
      });
    }
  }
}
