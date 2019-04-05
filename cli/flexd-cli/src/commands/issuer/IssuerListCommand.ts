import { Command, IExecuteInput } from '@5qtrs/cli';
import { IssuerService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Issuers',
  cmd: 'ls',
  summary: 'List issuers',
  description: 'Retrieves a list of trusted issuers associated with the account.',
  options: [
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

export class IssuerListCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const issuerService = await IssuerService.create(input);

    const issuers = await issuerService.listIssuers();

    await issuerService.displayIssuers(issuers);

    return 0;
  }
}
