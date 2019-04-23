import { Command, IExecuteInput } from '@5qtrs/cli';
import { IssuerService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Issuer',
  cmd: 'get',
  summary: 'Get an issuer',
  description: 'Retrieves the details of the issuer.',
  arguments: [
    {
      name: 'issuer',
      description: 'The id of the issuer to retrieve',
    },
  ],
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

export class IssuerGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];

    const issuerService = await IssuerService.create(input);

    const issuer = await issuerService.getIssuer(id);

    await issuerService.displayIssuer(issuer);

    return 0;
  }
}
