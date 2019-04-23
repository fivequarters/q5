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
  options: [
    {
      name: 'name',
      description: 'Only list clients with a display name that includes the given value (case-sensistive)',
    },
    {
      name: 'iss',
      description: 'Only list clients with an issuer that includes the given value (case-sensistive)',
    },
    {
      name: 'sub',
      description: 'Only list clients with a subject that includes the given value (case-sensistive)',
    },
  ],
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

    const displayNameContains = input.options.name as string;
    const issuerContains = input.options.iss as string;
    const subjectContains = input.options.sub as string;

    const clientService = await ClientService.create(input);

    const options = {
      displayNameContains,
      issuerContains,
      subjectContains,
    };

    const clients = await clientService.listClients(options);

    await clientService.displayClients(clients);

    return 0;
  }
}
