import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { IssuerService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Key Issuer',
  cmd: 'add',
  summary: 'Add a public key to an issuer',
  description: 'Adds a public key to a trusted issuer.',
  arguments: [
    {
      name: 'issuer',
      description: 'The id of the issuer to add the public key to',
    },
    {
      name: 'publicKey',
      description: 'The local path of a public key file',
    },
    {
      name: 'keyId',
      description: 'The key id for the public key',
    },
  ],
  options: [
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding adding the public key to the issuer',
        'will be displayed along with a prompt for confirmation',
      ].join(' '),
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class IssuerKeyAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerKeyAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id, publicKey, keyId] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const issuerService = await IssuerService.create(input);

    const issuer = await issuerService.getIssuer(id);

    if (confirm) {
      await issuerService.confirmAddPublicKey(issuer, keyId);
    }

    issuer.publicKeys = issuer.publicKeys || [];
    issuer.publicKeys.push({ publicKey, keyId });
    issuer.jsonKeysUrl = undefined;

    await issuerService.addPublicKey(id, issuer);

    return 0;
  }
}
