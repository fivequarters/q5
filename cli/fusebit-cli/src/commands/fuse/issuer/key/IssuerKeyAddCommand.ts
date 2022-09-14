import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { IssuerService, ExecuteService } from '../../../../services';

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

export class IssuerKeyAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerKeyAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id, publicKey, keyId] = input.arguments as string[];

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const issuer = await issuerService.getIssuer(id);

    await issuerService.confirmAddPublicKey(issuer, keyId);

    issuer.publicKeys = issuer.publicKeys || [];
    issuer.publicKeys.push({ publicKey, keyId });
    issuer.jsonKeysUrl = undefined;

    const updatedIssuer = await issuerService.addPublicKey(id, issuer);

    await issuerService.displayIssuer(updatedIssuer);

    return 0;
  }
}
