import { Command, IExecuteInput } from '@5qtrs/cli';
import { IssuerService, ExecuteService } from '../../../services';

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

export class IssuerGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const id = input.arguments[0] as string;

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const issuer = await issuerService.getIssuer(id);

    await issuerService.displayIssuer(issuer);

    return 0;
  }
}
