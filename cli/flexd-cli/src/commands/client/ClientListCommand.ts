import { Command, IExecuteInput } from '@5qtrs/cli';
import { ClientService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Clients',
  cmd: 'ls',
  summary: 'List clients',
  description: 'Lists clients of the given account',
};

// ----------------
// Exported Classes
// ----------------

export class ClientListCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const clientService = await ClientService.create(input);

    const clients = await clientService.listClients();

    await clientService.displayClients(clients);

    return 0;
  }
}
