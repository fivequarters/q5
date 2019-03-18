import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class ClientRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove Client',
      cmd: 'rm',
      summary: 'Remove a client',
      description: 'Removes access and all identity associations from the client with the given client id.',
      arguments: [
        {
          name: 'client',
          description: 'The id of the client to remove all acccess and identity associations from.',
        },
      ],
      options: [
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding removing the client will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new ClientRemoveCommand();
  }
}
