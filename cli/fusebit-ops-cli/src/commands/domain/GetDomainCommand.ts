import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DomainService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Domain',
  cmd: 'get',
  summary: 'Gets a domain',
  description: 'Retrieve the details of a given domain in the Fusebit platform.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the domain',
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

export class GetDomainCommand extends Command {
  public static async create() {
    return new GetDomainCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const domainName = input.arguments[0] as string;
    const domainService = await DomainService.create(input);

    const domain = await domainService.getDomain(domainName);
    await domainService.displayDomain(domain);
    return 0;
  }
}
