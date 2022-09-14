import { Command, IExecuteInput } from '@5qtrs/cli';
import { AgentService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Client',
  cmd: 'get',
  summary: 'Get a client',
  description: 'Retrieves the details of a client with the given client id.',
  arguments: [
    {
      name: 'client',
      description: 'The id of the client whose details should be retrieved',
    },
  ],
  options: [
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

export class ClientGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id] = input.arguments as string[];

    const clientService = await AgentService.create(input, false);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const client = await clientService.getAgent(id);

    await clientService.displayAgent(client);

    return 0;
  }
}
