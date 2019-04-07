import { Command, IExecuteInput } from '@5qtrs/cli';
import { ClientService } from '../../services';

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
      description: 'The id of the client whose details should be retrieved.',
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
    await input.io.writeLine();

    const [id] = input.arguments as string[];

    const clientService = await ClientService.create(input);

    const client = await clientService.getClient(id);

    await clientService.displayClient(client);

    return 0;
  }
}
