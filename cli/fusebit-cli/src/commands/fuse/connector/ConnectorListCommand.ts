import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ConnectorService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Connectors',
  cmd: 'ls',
  summary: 'List deployed connectors',
  description: 'Lists connectors.',
  options: [
    {
      name: 'count',
      aliases: ['c'],
      description: 'The number of connectors to list at a given time',
      type: ArgType.integer,
      default: '100',
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

export class ConnectorListCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ConnectorListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const output = input.options.output as string;
    const count = input.options.count as string;
    const next = input.options.next as string;

    const options: any = {
      count,
      next,
    };

    const connectorService = await ConnectorService.create(input);

    if (output === 'json') {
      const result = await connectorService.listEntities(options);
      result.items = result.items.map((item) => {
        delete item.data.files;
        return item;
      });
      const json = JSON.stringify(result, null, 2);
      input.io.writeLineRaw(json);
    } else {
      await input.io.writeLine();

      let getMore = true;
      let result;
      let firstDisplay = true;
      while (getMore) {
        result = await connectorService.listEntities(options);
        await connectorService.displayEntities(result.items, firstDisplay);
        firstDisplay = false;
        getMore = result.next ? await connectorService.confirmListMore() : false;
        if (getMore) {
          options.next = result.next;
        }
      }
    }

    return 0;
  }
}
