import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { AgentService, ExecuteService } from '../../../services';
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
  arguments: [
    {
      name: 'name',
      description: 'The display name of the client',
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

export class ClientAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const displayName = input.arguments[0] as string;

    const clientService = await AgentService.create(input, false);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const newClient = { displayName };

    await clientService.confirmAddAgent(newClient);

    const client = await clientService.addAgent(newClient);

    await clientService.displayAgent(client);

    return 0;
  }
}
