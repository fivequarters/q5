import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class IssuerAddCommand extends Command {
  private constructor() {
    super({
      name: 'Add Issuer',
      cmd: 'add',
      summary: 'Add an issuer',
      description: [
        `Adds an issuer to the given account.${EOL}${EOL}If the profile does not specify`,
        `the account, the relevant command options are required.${EOL}${EOL}A profile must`,
        "have 'manage' access to an account in order to add an issuer associated with that account.",
      ].join(' '),
      arguments: [
        {
          name: 'issuer',
          description: 'The id of the issuer to add.',
        },
      ],
      options: [
        {
          name: 'displayName',
          description: 'The display name of the issuer',
        },
        {
          name: 'jsonKeysUrl',
          description: [
            'The URL of the hosted json keys file. The file may be either in the',
            'JSON Web Key Specification format (RFC 7517) or may be a JSON object with key ids as the',
            'object property names and the corresponding public key data as the property value.',
          ].join(' '),
        },
        {
          name: 'publicKey',
          description: [
            "The local path of a public key file. If this option is specified, the 'keyId' option",
            'must also be specified',
          ].join(' '),
        },
        {
          name: 'keyId',
          description: [
            "The key id for the public key. If this option is specified, the 'publicKey' option",
            'must also be specified',
          ].join(' '),
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding adding the issuer will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new IssuerAddCommand();
  }
}
