import { Command, ICommand } from '@5qtrs/cli';
import { GetBackupCommand } from './GetBackupCommand';
import { ListBackupCommand } from './ListBackupCommand';
import { ScheduleBackupCommand } from './ScheduleBackupCommand';
import { DeleteBackupCommand } from './DeleteBackupCommand';
const command: ICommand = {
  name: 'Backup',
  cmd: 'backup',
  summary: 'Manage Backup Plans',
  description: 'Add and list Backups',
};

// maps the backup commands
export class BackupCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await ListBackupCommand.create());
    subCommands.push(await GetBackupCommand.create());
    subCommands.push(await ScheduleBackupCommand.create());
    subCommands.push(await DeleteBackupCommand.create());
    command.subCommands = subCommands;
    return new BackupCommand();
  }

  private constructor() {
    super(command);
  }
}
