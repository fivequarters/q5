import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IssuerService } from '../../services';

export class IssuerListCommand extends Command {
  private constructor() {
    super({
      name: 'List Issuers',
      cmd: 'ls',
      summary: 'List issuers',
      description: 'Retrieves a list of issuers that are associated with a given account.',
    });
  }

  public static async create() {
    return new IssuerListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    const issuers = await issuerService.listIssuers();
    if (!issuers) {
      executeService.verbose();
      return 1;
    }

    await issuerService.displayIssuers(issuers);

    return 0;
  }
}
