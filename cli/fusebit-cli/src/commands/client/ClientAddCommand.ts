import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ClientService } from '../../services';
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
      name: 'displayName',
      description: 'The display name of the client',
    },
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding adding the client will be displayed along with a',
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

export class ClientAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const confirm = input.options.confirm as boolean;
    const displayName = input.options.displayName as string;

    const clientService = await ClientService.create(input);

    const newClient = { displayName };

    if (confirm) {
      await clientService.confirmAddClient(newClient);
    }

    const client = await clientService.addClient(newClient);

    await clientService.displayClient(client);

    return 0;
  }
}
