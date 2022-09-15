import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { PluginService } from '../../../services/SlackPluginService';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Enable',
  cmd: 'enable',
  summary: 'Manage the Slack Plugin for Fusebit Ops Cli',
  description: 'Manage the configuration of the slack plugin for the Fusebit Ops Cli.',
  arguments: [
    {
      name: 'baseUrl',
      description:
        'The base URL of the Fusebit integration you would like to utilize. Check out https://github.com/fusebit/awesome-examples for the various plugins supported.',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class EnableSlackPluginCommand extends Command {
  public static async create() {
    return new EnableSlackPluginCommand(command);
  }

  constructor(command: ICommand) {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [baseUrl, token] = input.arguments as string[];
    const svc = await PluginService.create(input);
    await svc.installSlackPlugin({ integrationBaseUrl: baseUrl });
    return 0;
  }
}
