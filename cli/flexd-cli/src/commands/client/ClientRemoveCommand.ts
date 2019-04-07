import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ClientService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Client',
  cmd: 'rm',
  summary: 'Remove a client',
  description: 'Removes the client and all acccess and identity associations of the client.',
  arguments: [
    {
      name: 'client',
      description: 'The id of the client to remove all acccess and identity associations from',
    },
  ],
  options: [
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding removing the client will be displayed along with a',
        'prompt for confirmation.',
      ].join(' '),
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ClientRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const clientService = await ClientService.create(input);

    const client = await clientService.getClient(id);

    if (confirm) {
      await clientService.confirmRemoveClient(id, client);
    }

    await clientService.removeClient(id);

    return 0;
  }
}
