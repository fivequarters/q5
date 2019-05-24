import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ClientService } from '../../../services';
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
      description: 'The id of the client to associate with the identity.',
    },
    {
      name: 'issuerId',
      description: 'The issuer claim of access tokens that will identify the client.',
    },
    {
      name: 'subject',
      description: 'The subject claim of access tokens that will identify the client.',
    },
  ],
  options: [
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding adding the identity to the client will be displayed along with a',
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

export class ClientIdentityAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientIdentityAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id, issuerId, subject] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const clientService = await ClientService.create(input);

    const client = await clientService.getClient(id);

    const newIdentity = { issuerId, subject };

    if (confirm) {
      await clientService.confirmAddClientIdentity(client, newIdentity);
    }

    const update = { identities: [newIdentity] };
    if (client.identities) {
      update.identities.push(...client.identities);
    }

    const updatedClient = await clientService.addClientIdentity(client.id, update);

    await clientService.displayClient(updatedClient);

    return 0;
  }
}
