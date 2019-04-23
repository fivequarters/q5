import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ClientService } from '../../services';

export class ClientUpdateCommand extends Command {
  private constructor() {
    super({
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
          description: 'The id of the client to update.',
        },
      ],
      options: [
        {
          name: 'displayName',
          description: 'The updated display name of the client.',
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding updating the client will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new ClientUpdateCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;
    const displayName = input.options.displayName as string;

    const clientService = await ClientService.create(input);

    const client = await clientService.getClient(id);

    const update = {
      displayName: displayName === '' ? undefined : displayName || client.displayName,
    };

    if (confirm) {
      await clientService.confirmUpdateClient(client, update);
    }

    const updatedClient = await clientService.updateClient(client.id, update);

    await clientService.displayClient(updatedClient);

    return 0;
  }
}
