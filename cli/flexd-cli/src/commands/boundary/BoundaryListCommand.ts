import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class BoundaryListCommand extends Command {
  private constructor() {
    super({
      name: 'List Boundaries',
      cmd: 'ls',
      summary: 'List boundaries',
      description: [
        `Retrieves a list of boundaries in the given subscription.${EOL}${EOL}If`,
        'the profile does not specify the subscription, the relevant command option',
        `is required.${EOL}${EOL}A profile must have 'manage' access to a subscription`,
        'to retrieve a list of its boundaries.',
      ].join(' '),
    });
  }

  public static async create() {
    return new BoundaryListCommand();
  }
}
