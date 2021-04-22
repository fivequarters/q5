import AWS from 'aws-sdk';
import { Command, ICommand } from '@5qtrs/cli';

const command = {
  name: 'Backup',
  cmd: 'add',
  summary: 'Add a Backup',
  description: 'Add a backup plan to the Fusebit platform.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the backup plan',
    },
  ],
};

export class AddBackupCommand extends Command {
  public static async create() {
    return new AddBackupCommand();
  }

  private constructor() {
    super(command);
  }

  public async getBackupPlan(
    name: string,
    version: string,
    region: string
  ) {
    const params = {
      BackupPlanId: name,
    };
    const Backup = new AWS.Backup({ region });
    return Backup.getBackupPlan(params).promise();
  }

  public async createBackupPlan() {
    
  }
}
