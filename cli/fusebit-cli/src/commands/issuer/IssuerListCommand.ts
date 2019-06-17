import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
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
      name: 'name',
      description: 'Only list issuer with a display name that includes the given value (case-sensistive)',
    },
    {
      name: 'count',
      aliases: ['c'],
      description: 'The number of users to issuers at a given time',
      type: ArgType.integer,
      default: '10',
    },
    {
      name: 'next',
      aliases: ['n'],
      description: 'The opaque token from a previous list command used to continue listing',
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

export class IssuerListCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IssuerListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const nameContains = input.options.name as string;
    const format = input.options.format as string;
    const count = input.options.count as string;
    const next = input.options.next as string;

    const issuerService = await IssuerService.create(input);

    const options: any = {
      nameContains,
      count,
      next,
    };

    if (format === 'json') {
      input.io.writeRawOnly(true);
      const result = await issuerService.listIssuers(options);
      const json = JSON.stringify(result, null, 2);
      input.io.writeLineRaw(json);
    } else {
      await input.io.writeLine();

      let getMore = true;
      let result;
      let firstDisplay = true;
      while (getMore) {
        result = await issuerService.listIssuers(options);
        await issuerService.displayIssuers(result.items, firstDisplay);
        firstDisplay = false;
        getMore = result.next ? await issuerService.confirmListMore() : false;
        if (getMore) {
          options.next = result.next;
        }
      }
    }

    return 0;
  }
}
