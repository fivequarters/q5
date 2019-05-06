import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DomainService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Domain',
  cmd: 'add',
  summary: 'Add a domain',
  description: 'Adds a domain to the Fusebit platform in the given AWS account.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the domain',
    },
    {
      name: 'account',
      description: 'The name of the account to create the domain in',
    },
  ],
  options: [
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before adding the domain to the Fusebit platform',
      type: ArgType.boolean,
      default: 'true',
    },
    {
      name: 'format',
      aliases: ['f'],
      description: "The format to display the output: 'table', 'json'",
      default: 'table',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class AddDomainCommand extends Command {
  public static async create() {
    return new AddDomainCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [domainName, accountName] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const domainService = await DomainService.create(input);

    const domain = { domainName, accountName };
    await domainService.checkDomainExists(domain);

    if (confirm) {
      await domainService.confirmAddDomain(domain);
    }

    const addedDomain = await domainService.addDomain(domain);
    await domainService.displayDomain(addedDomain);

    return 0;
  }
}
