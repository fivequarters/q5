import { Command, ArgType } from '@5qtrs/cli';

export class ClientAccessRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove Client Access',
      cmd: 'rm',
      summary: 'Removes access from a client',
      description: "Removes a client's access to a given account, subscription, boundary or function.",
      arguments: [
        {
          name: 'client',
          description: 'The id of the client from which to remove access.',
        },
      ],
      options: [
        {
          name: 'subscription',
          aliases: ['s'],
          description: [
            'The subscription id to which access should be removed from the client. Must be',
            "either a specific subscription id or the value '*' indicating all subscriptions.",
          ].join(' '),
        },
        {
          name: 'boundary',
          aliases: ['b'],
          description: [
            'The boundary id to which access should be removed from the client. Must be',
            "either a specific boundary id or the value '*' indicating all boundaries.",
          ].join(' '),
        },
        {
          name: 'function',
          aliases: ['f'],
          description: [
            'The function id to which access should be removed from the client. Must be',
            "either a specific function id or the value '*' indicating all functions.",
          ].join(' '),
        },
        {
          name: 'action',
          description: 'The access action to no longer allow the client to perform.',
          default: 'manage',
        },
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
      modes: ['account'],
    });
  }

  public static async create() {
    return new ClientAccessRemoveCommand();
  }
}
