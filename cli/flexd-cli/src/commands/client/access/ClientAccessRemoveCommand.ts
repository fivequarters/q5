import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, ClientService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Client Access',
  cmd: 'rm',
  summary: 'Removes access from a client',
  description: "Removes a client's access to a given account, subscription, boundary or function.",
  arguments: [
    {
      name: 'client',
      description: 'The id of the client from which to remove access.',
    },
    {
      name: 'action',
      description: 'The action to remove from the client',
    },
    {
      name: 'resource',
      description: 'The resource to remove from the client',
    },
  ],
  options: [
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding removing access from the client will be displayed along with a',
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

export class ClientAccessRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientAccessRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id, action, resource] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const clientService = await ClientService.create(input);
    const executeService = await ExecuteService.create(input);

    const client = await clientService.getClient(id);
    client.access = client.access || {};
    client.access.allow = client.access.allow || [];

    let accessIndex = -1;
    for (let i = 0; i < client.access.allow.length; i++) {
      const access = client.access.allow[i];
      if (access.action === action && access.resource === resource) {
        accessIndex = i;
        i = client.access.allow.length;
      }
    }

    if (accessIndex === -1) {
      await executeService.warning(
        'No Access',
        Text.create(
          "The client '",
          Text.bold(client.id),
          "' does not have any access with action '",
          Text.bold(action),
          "' for resource '",
          Text.bold(resource),
          "'"
        )
      );
      return 1;
    }

    const access = { action, resource };

    if (confirm) {
      await clientService.confirmRemoveClientAccess(client, access);
    }

    client.access.allow.splice(accessIndex, 1);

    const update = { access: { allow: client.access.allow } };
    const updatedClient = await clientService.removeClientAccess(client.id, update);

    await clientService.displayClient(updatedClient);

    return 0;
  }
}
