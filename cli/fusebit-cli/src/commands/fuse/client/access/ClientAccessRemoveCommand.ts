import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, AgentService } from '../../../../services';
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
      description: 'The action of the access to remove from the client',
    },
    {
      name: 'resource',
      description: 'The resource of the access to remove from the client',
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

export class ClientAccessRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientAccessRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id, action, rawResource] = input.arguments as string[];

    const clientService = await AgentService.create(input, false);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    let resource = !rawResource || rawResource[rawResource.length - 1] === '/' ? rawResource : `${rawResource}/`;

    const client = await clientService.getAgent(id);
    client.access = client.access || {};
    client.access.allow = client.access.allow || [];

    let accessIndex = -1;
    for (let i = 0; i < client.access.allow.length; i++) {
      const access = client.access.allow[i];
      if (access.action === action) {
        if (resource && access.resource.indexOf(resource) !== -1) {
          accessIndex = i;
          resource = access.resource;
          i = client.access.allow.length;
        } else {
          if (accessIndex === -1) {
            accessIndex = i;
            resource = access.resource;
          } else {
            await executeService.error(
              'Multiple Resources',
              Text.create(
                "The client '",
                Text.bold(client.id),
                "' has more than one access with action '",
                Text.bold(action),
                "' so the resource must be specified"
              )
            );
          }
        }
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

    await clientService.confirmRemoveAgentAccess(client, access);

    client.access.allow.splice(accessIndex, 1);

    const update = { access: { allow: client.access.allow } };
    const updatedClient = await clientService.removeAgentAccess(client.id, update);

    await clientService.displayAgent(updatedClient);

    return 0;
  }
}
