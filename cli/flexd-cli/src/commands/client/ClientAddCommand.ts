import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class ClientAddCommand extends Command {
  private constructor() {
    super({
      name: 'Add Client',
      cmd: 'add',
      summary: 'Add a client',
      description: [
        `Adds a client with the given display name. ${EOL}${EOL}Only a profile`,
        "with 'manage' access to the account can add a client.",
      ].join(' '),
      arguments: [],
      options: [
        {
          name: 'displayName',
          description: 'The display name of the client to add.',
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding adding the client will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new ClientAddCommand();
  }
}
