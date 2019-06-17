import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { FunctionService } from '../../services';

export class FunctionListCommand extends Command {
  private constructor() {
    super({
      name: 'List Functions',
      cmd: 'ls',
      summary: 'List deployed functions',
      description: [`Lists functions deployed within a given subscription or boundary.`].join(' '),
      options: [
        {
          name: 'cron',
          description: [
            'If set to true, only scheduled functions are returned. If set to false,',
            'only non-scheduled functions are returned. ',
            'If unspecified, both scheduled and unscheduled functions are returned',
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
    });
  }

  public static async create() {
    return new FunctionListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const format = input.options.format as string;
    const cron = input.options.cron as boolean;
    const count = input.options.count as string;
    const next = input.options.next as string;

    const options: any = {
      cron,
      count,
      next,
    };

    const functionService = await FunctionService.create(input);

    if (format === 'json') {
      input.io.writeRawOnly(true);
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
