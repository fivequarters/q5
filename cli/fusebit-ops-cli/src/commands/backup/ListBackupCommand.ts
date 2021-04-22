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
  ],
};

export class ListBackupCommand extends Command {
  public static async create() {
    return new ListBackupCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute
}
