import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class ClientUpdateCommand extends Command {
  private constructor() {
    super({
      name: 'Update Client',
      cmd: 'update',
      summary: 'Update a client',
      description: [
        "Updates a client with the given client id. Only a client's display name",
        `can be updated.${EOL}${EOL}To add or remove identities associated with the client, use the 'client identity'`,
        `commands.${EOL}${EOL}To add or remove access from the client, use the 'client access' commands.`,
      ].join(' '),
      arguments: [
        {
          name: 'client',
          description: 'The id of the client to update.',
        },
      ],
      options: [
        {
          name: 'displayName',
          description: 'The new display name of the client.',
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
}
