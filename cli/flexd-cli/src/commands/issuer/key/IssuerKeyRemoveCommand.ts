import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class IssuerKeyRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Rrmove Key Issuer',
      cmd: 'rm',
      summary: 'Remove a public key from an issuer',
      description: [
        `Removes a public key from an issuer.${EOL}${EOL}If the profile does not specify`,
        `the account, the relevant command options are required.${EOL}${EOL}A profile must`,
        "have 'manage' access to an account in order to remove a public key from an issuer.",
      ].join(' '),
      arguments: [
        {
          name: 'issuer',
          description: 'The id of the issuer to remove the public key from.',
        },
        {
          name: 'keyId',
          description: 'The key id for the public key to remove.',
        },
      ],
      options: [
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding removing the public key from the issuer',
            'will be displayed along with a prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new IssuerKeyRemoveCommand();
  }
}
