import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { AgentService, ExecuteService } from '../../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Client Identity',
  cmd: 'add',
  summary: 'Add an identity to a client',
  description: Text.create(
    "Adds an identity to a client. The client will be associated with all access tokens with the given '",
    Text.bold('iss'),
    "' (issuer) and '",
    Text.bold('sub'),
    "' (subject) claims."
  ),
  arguments: [
    {
      name: 'client',
      description: 'The id of the client to associate with the identity',
    },
    {
      name: 'issuer',
      description: 'The issuer claim from access tokens that will identify the client',
    },
    {
      name: 'subject',
      description: 'The subject claim from access tokens that will identify the client',
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

export class ClientIdentityAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientIdentityAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id, issuerId, subject] = input.arguments as string[];

    const clientService = await AgentService.create(input, false);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const client = await clientService.getAgent(id);

    const newIdentity = { issuerId, subject };

    await clientService.confirmAddAgentIdentity(client, newIdentity);

    const update = { identities: [newIdentity] };
    if (client.identities) {
      update.identities.push(...client.identities);
    }

    const updatedClient = await clientService.addAgentIdentity(client.id, update);

    await clientService.displayAgent(updatedClient);

    return 0;
  }
}
