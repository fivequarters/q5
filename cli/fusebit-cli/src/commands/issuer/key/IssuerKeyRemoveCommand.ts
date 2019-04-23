import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IssuerService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Rrmove Key Issuer',
  cmd: 'rm',
  summary: 'Remove a public key from an issuer',
  description: 'Removes a public key from a trusted issuer.',
  arguments: [
    {
      name: 'issuer',
      description: 'The id of the issuer to remove the public key from.',
    },
    {
      name: 'keyId',
      description: 'The key id of the public key to remove.',
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
};

// ----------------
// Exported Classes
// ----------------

export class IssuerKeyRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerKeyRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id, keyId] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    const issuer = await issuerService.getIssuer(id);
    issuer.publicKeys = issuer.publicKeys || [];

    let keyIndex = -1;
    for (let i = 0; i < issuer.publicKeys.length; i++) {
      if (issuer.publicKeys[i].keyId === keyId) {
        keyIndex = i;
        i = issuer.publicKeys.length;
      }
    }

    if (keyIndex === -1) {
      await executeService.warning(
        'No Public Key',
        Text.create("The '", Text.bold(id), "' issuer does not have a public key with id '", Text.bold(keyId), "'")
      );
      return 1;
    }

    if (confirm) {
      await issuerService.confirmRemovePublicKey(issuer, keyId);
    }

    issuer.publicKeys.splice(keyIndex, 1);

    await issuerService.removePublicKey(id, issuer);

    return 0;
  }
}
