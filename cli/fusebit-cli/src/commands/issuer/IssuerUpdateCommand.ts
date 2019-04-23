import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { IssuerService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Update Issuer',
  cmd: 'update',
  summary: 'Update an issuer',
  description: Text.create(
    'Updates a trusted issuer associated with the account.',
    Text.eol(),
    Text.eol(),
    'This command can only be used to update the issuer display name and json keys URI. ',
    "To add or remove public keys associated with the issuer, use the '",
    Text.bold('issuer key'),
    "' commands."
  ),
  arguments: [
    {
      name: 'issuer',
      description: 'The id of the issuer to update',
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
      name: 'confirm',
      description: [
        'If set to true, the details regarding updating the issuer will be displayed along with a',
        'prompt for confirmation.',
      ].join(' '),
      type: ArgType.boolean,
      default: 'true',
    },
    {
      name: 'format',
      description: "The format to display the output: 'table', 'json'",
      default: 'table',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class IssuerUpdateCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerUpdateCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];
    const displayName = input.options.displayName as string;
    const jsonKeysUrl = input.options.jsonKeysUrl as string;
    const confirm = input.options.confirm as boolean;

    const issuerService = await IssuerService.create(input);

    const issuer = await issuerService.getIssuer(id);

    const update = {
      displayName: displayName === '' ? undefined : displayName || issuer.displayName,
      jsonKeysUrl: jsonKeysUrl === '' ? undefined : jsonKeysUrl || issuer.jsonKeysUrl,
      publicKeys: jsonKeysUrl === '' ? issuer.publicKeys : [],
    };

    if (confirm) {
      await issuerService.confirmUpdateIssuer(issuer, update);
    }

    await issuerService.updateIssuer(id, update);

    return 0;
  }
}
