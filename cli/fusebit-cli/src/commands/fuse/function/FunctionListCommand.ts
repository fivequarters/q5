import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { FunctionService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Functions',
  cmd: 'ls',
  summary: 'List deployed functions',
  description: 'Lists functions deployed within a given subscription or boundary.',
  options: [
    {
      name: 'cron',
      description: [
        'If set to true, only list scheduled functions. If set to false,',
        'only list non-scheduled functions. If not set, list all functions',
      ].join(' '),
      type: ArgType.boolean,
    },
    {
      name: 'count',
      aliases: ['c'],
      description: 'The number of functions to list at a given time',
      type: ArgType.integer,
      default: '100',
    },
    {
      name: 'search',
      aliases: ['s'],
      description: [
        'Search for functions containing this function property. Search',
        'supports a single filtering criteria, in the form of `search=key` for any',
        'function posessing a key matching that value, or `--search key=value` for',
        'functions that specifically match a value.  If the key or value contains',
        'an `=`, encode them to the URI specification first.',
      ].join(' '),
      type: ArgType.string,
      allowMany: true,
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

export class FunctionListCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new FunctionListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const output = input.options.output as string;
    const cron = input.options.cron as boolean;
    const count = input.options.count as string;
    const search = input.options.search as string[];
    const next = input.options.next as string;

    const options: any = {
      cron,
      count,
      search,
      next,
    };

    const functionService = await FunctionService.create(input);

    if (output === 'json') {
      const result = await functionService.listFunctions(options);
      const json = JSON.stringify(result, null, 2);
      input.io.writeLineRaw(json);
    } else {
      await input.io.writeLine();

      let getMore = true;
      let result;
      let firstDisplay = true;
      while (getMore) {
        result = await functionService.listFunctions(options);
        await functionService.displayFunctions(result.items, firstDisplay);
        firstDisplay = false;
        getMore = result.next ? await functionService.confirmListMore() : false;
        if (getMore) {
          options.next = result.next;
        }
      }
    }

    return 0;
  }
}
