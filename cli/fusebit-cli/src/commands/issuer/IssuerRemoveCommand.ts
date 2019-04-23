import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { IssuerService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Issuer',
  cmd: 'rm',
  summary: 'Remove an issuer',
  description: 'Removes the issuer from the list of trusted issuers associated with the account.',
  arguments: [
    {
      name: 'issuer',
      description: 'The id of the issuer to remove',
    },
  ],
  options: [
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding removing the issuer will be displayed along with a',
        'prompt for confirmation.',
      ].join(' '),
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class IssuerRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const issuerService = await IssuerService.create(input);

    const issuer = await issuerService.getIssuer(id);

    if (confirm) {
      await issuerService.confirmRemoveIssuer(id, issuer);
    }

    await issuerService.removeIssuer(id);

    return 0;
  }
}
