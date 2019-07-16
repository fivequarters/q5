import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ClientService, ExecuteService } from '../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Client',
  cmd: 'add',
  summary: 'Add a client',
  description: Text.create(
    'Adds a client with the given display name.',
    Text.eol(),
    Text.eol(),
    "Identities can be associated with the client using the '",
    Text.bold('client identity'),
    "' commands and access can be given to the client using the '",
    Text.bold('client access'),
    "' commands."
  ),
  options: [
    {
      name: 'name',
      aliases: ['n'],
      description: 'The display name of the client',
    },
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

export class ClientAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const displayName = input.options.name as string;

    const clientService = await ClientService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const newClient = { displayName };

    await clientService.confirmAddClient(newClient);

    const client = await clientService.addClient(newClient);

    await clientService.displayClient(client);

    return 0;
  }
}
