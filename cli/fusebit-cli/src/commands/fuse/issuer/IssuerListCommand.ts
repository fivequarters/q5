import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { IssuerService, ExecuteService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Issuers',
  cmd: 'ls',
  summary: 'List issuers',
  description: 'Retrieves a list of trusted issuers associated with the account.',
  arguments: [
    {
      name: 'name',
      description: Text.create(
        'Only list issuers with a display name that includes the given text ',
        Text.dim('(case-sensitive)')
      ),
      required: false,
    },
  ],
  options: [
    {
      name: 'count',
      aliases: ['c'],
      description: 'The number of issuers to list at a given time',
      type: ArgType.integer,
      default: '10',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
    {
      name: 'next',
      aliases: ['n'],
      description: Text.create([
        "The opaque next token obtained from a previous list command when using the '",
        Text.bold('--output json'),
        "' option ",
      ]),
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
    const nameContains = input.arguments[0] as string;
    const output = input.options.output as string;
    const count = input.options.count as string;
    const next = input.options.next as string;

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const options: any = {
      nameContains,
      count,
      next,
    };

    if (output === 'json') {
      const result = await issuerService.listIssuers(options);
      const json = JSON.stringify(result, null, 2);
      await input.io.writeLineRaw(json);
    } else {
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
