import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { IssuerService, ExecuteService } from '../../../services';

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
    'This command can only be used to update the issuer display name and json keys URL. ',
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
      name: 'name',
      aliases: ['n'],
      description: 'The display name of the issuer',
    },
    {
      name: 'jsonKeysUrl',
      aliases: ['j'],
      description: [
        'The URL of the hosted json keys file. The file may be either in the',
        'JSON Web Key Specification format (RFC 7517) or may be a JSON object with key ids as the',
        'object property names and the corresponding public key data as the property value',
      ].join(' '),
    },
    {
      name: 'quiet',
      aliases: ['q'],
      description: 'If set to true, does not prompt for confirmation',
      type: ArgType.boolean,
      default: 'false',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
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
    const id = input.arguments[0] as string;
    const displayName = input.options.name as string;
    const jsonKeysUrl = input.options.jsonKeysUrl as string;

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const issuer = await issuerService.getIssuer(id);

    const update = {
      displayName: displayName === '' ? undefined : displayName || issuer.displayName,
      jsonKeysUrl: jsonKeysUrl === '' ? undefined : jsonKeysUrl || issuer.jsonKeysUrl,
      publicKeys: jsonKeysUrl === '' ? issuer.publicKeys : undefined,
    };

    await issuerService.confirmUpdateIssuer(issuer, update);

    const updatedIssuer = await issuerService.updateIssuer(id, update);

    await issuerService.displayIssuer(updatedIssuer);

    return 0;
  }
}
