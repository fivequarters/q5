import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, ClientService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Client Identity',
  cmd: 'rm',
  summary: 'Removes an identity from a client',
  description: Text.create(
    "Removes an identity from a client. The client will no longer be associated with access tokens with the given '",
    Text.bold('iss'),
    "' (issuer) and '",
    Text.bold('sub'),
    "' (subject) claims."
  ),
  arguments: [
    {
      name: 'client',
      description: 'The id of the client from which to remove the associate with the identity.',
    },
    {
      name: 'iss',
      description: 'The issuer claim of access tokens that currently identify the client.',
    },
    {
      name: 'sub',
      description: 'The subject claim of access tokens that currently identify the client.',
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

export class ClientIdentityRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientIdentityRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id, iss, sub] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const clientService = await ClientService.create(input);
    const executeService = await ExecuteService.create(input);

    const client = await clientService.getClient(id);
    client.identities = client.identities || [];

    let identityIndex = -1;
    for (let i = 0; i < client.identities.length; i++) {
      const identity = client.identities[i];
      if (identity.iss === iss && identity.sub === sub) {
        identityIndex = i;
        i = client.identities.length;
      }
    }

    if (identityIndex === -1) {
      await executeService.warning(
        'No Identity',
        Text.create(
          "The client '",
          Text.bold(client.id),
          "' does not have an identity with an issuer of '",
          Text.bold(iss),
          "' and a subject of '",
          Text.bold(sub),
          "'"
        )
      );
      return 1;
    }

    const identity = { iss, sub };

    if (confirm) {
      await clientService.confirmRemoveClientIdentity(client, identity);
    }

    client.identities.splice(identityIndex, 1);

    const update = { identities: client.identities };
    const updatedClient = await clientService.removeClientIdentity(client.id, update);

    await clientService.displayClient(updatedClient);

    return 0;
  }
}
