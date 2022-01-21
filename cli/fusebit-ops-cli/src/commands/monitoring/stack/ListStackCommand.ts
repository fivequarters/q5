import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { MonitoringService } from '../../../services/';

const command: ICommand = {
  name: 'List Monitoring Stacks',
  cmd: 'ls',
  summary: 'List Fusebit Monitoring Stacks',
  description: 'Listing Fusebit Monitoring Stacks',
  options: [
    {
      name: 'deploymentName',
      description: 'The deployment the stacks belong to.',
    },
  ],
};

export class ListStackCommand extends Command {
  public static async create() {
    return new ListStackCommand();
  }

  constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const deploymentName = input.options.deploymentName as string | undefined;
    const svc = await MonitoringService.create(input);
    await svc.StackList(deploymentName);
    return 0;
  }
}
