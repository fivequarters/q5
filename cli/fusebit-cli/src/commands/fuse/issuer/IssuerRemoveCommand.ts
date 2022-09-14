import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { IssuerService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Issuer',
  cmd: 'rm',
  summary: 'Remove an issuer',
  description: 'Removes an issuer from the list of trusted issuers associated with the account.',
  arguments: [
    {
      name: 'issuer',
      description: 'The id of the issuer to remove',
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

export class IssuerRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const id = input.arguments[0] as string;

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const issuer = await issuerService.getIssuer(id);

    await issuerService.confirmRemoveIssuer(id, issuer);

    await issuerService.removeIssuer(id);

    return 0;
  }
}
