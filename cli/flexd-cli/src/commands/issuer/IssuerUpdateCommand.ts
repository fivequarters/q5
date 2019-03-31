import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class IssuerUpdateCommand extends Command {
  private constructor() {
    super({
      name: 'Update Issuer',
      cmd: 'update',
      summary: 'Update an issuer',
      description: [
        `Updates an issuer in the given account.${EOL}${EOL}If the profile does not specify`,
        `the account, the relevant command options are required.${EOL}${EOL}A profile must`,
        "have 'manage' access to an account in order to update an issuer associated with that account.",
        `${EOL}${EOL}This command can only be used to update the issuer display name and json keys URL.`,
        "To add or remove particular public keys associated with the issuer, use the 'issuer key' commands.",
      ].join(' '),
      arguments: [
        {
          name: 'issuer',
          description: 'The id of the issuer to update.',
        },
      ],
      options: [
        {
          name: 'displayName',
          description: 'The display name of the issuer',
        },
        {
          name: 'jsonKeysUri',
          description: [
            'The URL of the hosted json keys file. The file may be either in the',
            'JSON Web Key Specification format (RFC 7517) or may be a JSON object with key ids as the',
            'object property names and the corresponding public key data as the property value.',
          ].join(' '),
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding updating the issuer will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new IssuerUpdateCommand();
  }
}
