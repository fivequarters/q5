import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, AgentService } from '../../../../services';
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
      description: 'The id of the client from which to remove the associated identity',
    },
    {
      name: 'issuer',
      description: 'The issuer claim from access tokens that currently identify the client',
    },
    {
      name: 'subject',
      description: 'The subject claim from access tokens that currently identify the client',
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

export class ClientIdentityRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientIdentityRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id, issuerId, subject] = input.arguments as string[];

    const clientService = await AgentService.create(input, false);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const client = await clientService.getAgent(id);
    client.identities = client.identities || [];

    let identityIndex = -1;
    for (let i = 0; i < client.identities.length; i++) {
      const identity = client.identities[i];
      if (identity.issuerId === issuerId && identity.subject === subject) {
        identityIndex = i;
        i = client.identities.length;
      }
    }

    if (identityIndex === -1) {
      await executeService.error(
        'No Identity',
        Text.create(
          "The client '",
          Text.bold(client.id),
          "' does not have an identity with an issuer of '",
          Text.bold(issuerId),
          "' and a subject of '",
          Text.bold(subject),
          "'"
        )
      );
    }

    const identity = { issuerId, subject };

    await clientService.confirmRemoveAgentIdentity(client, identity);

    client.identities.splice(identityIndex, 1);

    const update = { identities: client.identities };
    const updatedClient = await clientService.removeAgentIdentity(client.id, update);

    await clientService.displayAgent(updatedClient);

    return 0;
  }
}
