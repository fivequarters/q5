import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class ClientAccessAddCommand extends Command {
  private constructor() {
    super({
      name: 'Add Client Access',
      cmd: 'add',
      summary: 'Add access to a client',
      description: [
        `Adds access to a client with the given client id.${EOL}${EOL}Access to a given account, subscription`,
        'boundary, or function can be given to the client using the command options.',
      ].join(' '),
      arguments: [
        {
          name: 'client',
          description: 'The id of the client to give access to.',
        },
      ],
      options: [
        {
          name: 'subscription',
          aliases: ['s'],
          description: [
            'The subscription id to which access should be given to the client. Must be',
            "either a specific subscription id or the value '*' indicating all subscriptions.",
          ].join(' '),
        },
        {
          name: 'boundary',
          aliases: ['b'],
          description: [
            'The boundary id to which access should be given to the client. Must be',
            "either a specific boundary id or the value '*' indicating all boundaries.",
          ].join(' '),
        },
        {
          name: 'function',
          aliases: ['f'],
          description: [
            'The function id to which access should be given to the client. Must be',
            "either a specific function id or the value '*' indicating all functions.",
          ].join(' '),
        },
        {
          name: 'action',
          description: 'The access action to allow the client to perform.',
          default: 'manage',
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
      modes: ['account'],
    });
  }

  public static async create() {
    return new ClientAccessAddCommand();
  }
}
