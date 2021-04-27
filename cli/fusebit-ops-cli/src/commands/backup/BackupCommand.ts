import { Command, ICommand } from '@5qtrs/cli';
import { GetBackupCommand } from './GetBackupCommand';
import { ListBackupCommand } from './ListBackupCommand';

const command: ICommand = {
  name: "Backup",
  cmd: "backup",
  summary: 'Manage Backup Plans',
  description: 'Add and list Backups'
}

export class BackupCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await ListBackupCommand.create());
    subCommands.push(await GetBackupCommand.create())
    command.subCommands = subCommands;
    return new BackupCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}