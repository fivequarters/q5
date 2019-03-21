import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class IssuerRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove Issuer',
      cmd: 'rm',
      summary: 'Remove an issuer',
      description: [
        `Removes the association between the account and the given issuer.${EOL}${EOL}If`,
        'the profile does not specify the account, the relevant command options are required.',
        `${EOL}${EOL}A profile must have 'manage' access to an account in order to remove`,
        'the association with an issuer of that account.',
      ].join(' '),
      arguments: [
        {
          name: 'issuer',
          description: 'The id of the issuer from which to remove the association to the account.',
        },
      ],
      options: [
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding removing the issuer will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new IssuerRemoveCommand();
  }
}
