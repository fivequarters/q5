import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IssuerService } from '../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Issuer',
  cmd: 'add',
  summary: 'Add an issuer',
  description: 'Adds an issuer to the list of trusted issuers associated with the account.',
  arguments: [
    {
      name: 'issuer',
      description: 'The issuer to add',
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
      description: Text.create(
        "The local path of a public key file. If this option is specified, the '",
        Text.bold('keyId'),
        "' option must also be specified"
      ),
    },
    {
      name: 'keyId',
      description: Text.create(
        "The key id for the public key. If this option is specified, the '",
        Text.bold('publicKey'),
        "' option must also be specified"
      ),
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: [
        'If set to true, the details regarding adding the issuer will be displayed along with a',
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

export class IssuerAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;
    const displayName = input.options.displayName as string;
    const jsonKeysUrl = input.options.jsonKeysUrl as string;
    const publicKey = input.options.publicKey as string;
    const keyId = input.options.keyId as string;

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    if (jsonKeysUrl) {
      if (publicKey || keyId) {
        const option = publicKey ? 'publicKey' : 'keyId';
        await executeService.error(
          'Invaild Options',
          Text.create(
            "The '",
            Text.bold(option),
            "' option can not be specified if the '",
            Text.bold('jsonKeysUrl'),
            "' option is specified."
          )
        );
        return 1;
      }
    } else if (!keyId || !publicKey) {
      await executeService.error(
        'Invaild Options',
        Text.create(
          "Both the '",
          Text.bold('keyId'),
          "' option and the '",
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

    if (confirm) {
      await issuerService.confirmAddIssuer(id, newIssuer);
    }

    const issuer = await issuerService.addIssuer(id, newIssuer);

    await issuerService.displayIssuer(issuer);

    return 0;
  }
}
