import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IssuerService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Issuer',
  cmd: 'add',
  summary: 'Add an issuer',
  description: 'Adds an issuer to the set of trusted issuers associated with an account.',
  arguments: [
    {
      name: 'issuer',
      description: 'The issuer id to add',
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
      name: 'publicKey',
      aliases: ['p'],
      description: Text.create(
        "The local path of a public key file. If this option is specified, the '",
        Text.bold('keyId'),
        "' option must also be specified"
      ),
    },
    {
      name: 'keyId',
      aliases: ['k'],
      description: Text.create(
        "The key id for the public key. If this option is specified, the '",
        Text.bold('publicKey'),
        "' option must also be specified"
      ),
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

export class IssuerAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id] = input.arguments as string[];
    const displayName = input.options.name as string;
    const jsonKeysUrl = input.options.jsonKeysUrl as string;
    const publicKey = input.options.publicKey as string;
    const keyId = input.options.keyId as string;

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    if (jsonKeysUrl) {
      if (publicKey || keyId) {
        const option = publicKey ? 'publicKey' : 'keyId';
        await executeService.error(
          'Invalid Option',
          Text.create(
            "The '",
            Text.bold(option),
            "' option can not be specified if the '",
            Text.bold('jsonKeysUrl'),
            "' option is specified."
          )
        );
      }
    } else if (!keyId || !publicKey) {
      await executeService.error(
        'Invalid Option',
        Text.create(
          "Either the '",
          Text.bold('keyId'),
          "' option or the '",
          Text.bold('publicKey'),
          "' option must be specified."
        )
      );
    }

    const newIssuer = {
      displayName,
      jsonKeysUrl,
      publicKeyPath: publicKey,
      publicKeyId: keyId,
    };

    await issuerService.confirmAddIssuer(id, newIssuer);

    const issuer = await issuerService.addIssuer(id, newIssuer);

    await issuerService.displayIssuer(issuer);

    return 0;
  }
}
