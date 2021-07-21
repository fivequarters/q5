import { Command, IExecuteInput } from '@5qtrs/cli';
import { RestoreService } from '../../services';

const command = {
  name: 'Restore',
  cmd: 'restore',
  summary: 'Starts a Full Table Restore',
  description: 'Starts a full table restore on a deployment with backups',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output; 'pretty', 'json'",
      default: 'pretty',
    },
    {
      name: 'force',
      aliases: ['f'],
      description: 'Force a restore, could break the platform, no promises.',
    },
    {
      name: 'deployment-name',
      aliases: ['d'],
      description: 'The name of the deployment you want to restore.',
    },
    {
      name: 'backup-plan-name',
      aliases: ['b'],
      description: 'The backup plan you want to use to restore from.',
    },
    {
      name: 'deployment-region',
      aliases: ['r'],
      description: 'The region of the deployment.',
    },
  ],
};

export class StartRestoreCommand extends Command {
  public static async create() {
    return new StartRestoreCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<any> {
    const output = input.options.output as string;
    const deploymentName = input.options['deployment-name'] as string;
    const backupPlanName = input.options['backup-plan-name'] as string;
    const deploymentRegion = input.options['deployment-region'] as string;
    const force = input.options.force as boolean;
    const restoreService = await RestoreService.create(input);
    await restoreService.restoreFromBackup(force, deploymentName, backupPlanName, deploymentRegion);
  }
}
