import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ClientService, ExecuteService } from '../../services';

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
      description: 'The id of the client to remove',
    },
  ],
  options: [
    {
      name: 'quiet',
      aliases: ['q'],
      description: 'If set to true, does not prompt for confirmation',
      type: ArgType.boolean,
      default: 'false',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
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
    const [id] = input.arguments as string[];

    const clientService = await ClientService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const client = await clientService.getClient(id);

    await clientService.confirmRemoveClient(id, client);

    await clientService.removeClient(id);

    return 0;
  }
}
