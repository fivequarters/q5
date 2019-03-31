import { EOL } from 'os';
import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IssuerService } from '../../services';

export class IssuerGetCommand extends Command {
  private constructor() {
    super({
      name: 'Get Issuer',
      cmd: 'get',
      summary: 'Get an issuer',
      description: 'Retrieves the details of the issuer',

      arguments: [
        {
          name: 'issuer',
          description: 'The id of the issuer to retrieve the details of',
        },
      ],
    });
  }

  public static async create() {
    return new IssuerGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id] = input.arguments as string[];

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    const issuer = await issuerService.getIssuer(id);
    if (!issuer) {
      executeService.verbose();
      return 1;
    }

    await issuerService.displayIssuer(issuer);

    return 0;
  }
}
