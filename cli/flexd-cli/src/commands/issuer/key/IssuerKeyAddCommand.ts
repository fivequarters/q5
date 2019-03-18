import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class IssuerKeyAddCommand extends Command {
  private constructor() {
    super({
      name: 'Add Key Issuer',
      cmd: 'add',
      summary: 'Add an public key to an issuer',
      description: [
        `Adds a public key to an issuer.${EOL}${EOL}If the profile does not specify`,
        `the account, the relevant command options are required.${EOL}${EOL}A profile must`,
        "have 'manage' access to an account in order to add a public key to an issuer.",
      ].join(' '),
      arguments: [
        {
          name: 'issuer',
          description: 'The id of the issuer to add the public key to.',
        },
        {
          name: 'publicKey',
          description: 'The local path of a public key file.',
        },
        {
          name: 'keyId',
          description: 'The key id for the public key.',
        },
      ],
      options: [
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding adding the public key to the issuer',
            'will be displayed along with a prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new IssuerKeyAddCommand();
  }
}
