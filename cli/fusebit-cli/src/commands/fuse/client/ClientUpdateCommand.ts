import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { AgentService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Update Client',
  cmd: 'update',
  summary: 'Update a client',
  description: Text.create(
    'Updates the display name of a client.',
    Text.eol(),
    Text.eol(),
    "To add or remove identities associated with the client, use the '",
    Text.bold('client identity'),
    "' commands and to add or remove access from the client, use the '",
    Text.bold('client access'),
    "' commands."
  ),
  arguments: [
    {
      name: 'client',
      description: 'The id of the client to update',
    },
  ],
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

export class ClientUpdateCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientUpdateCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id] = input.arguments as string[];
    const displayName = input.options.name as string;

    const clientService = await AgentService.create(input, false);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const client = await clientService.getAgent(id);

    const update = {
      displayName: displayName === '' ? undefined : displayName || client.displayName,
    };

    await clientService.confirmUpdateAgent(client, update);

    const updatedClient = await clientService.updateAgent(client.id, update);

    await clientService.displayAgent(updatedClient);

    return 0;
  }
}
