import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { StorageService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Storage',
  cmd: 'ls',
  summary: 'List storage items',
  description: 'Lists storage items with an id with a particular prefix.',
  arguments: [
    {
      name: 'prefix',
      description: 'The id prefix of the storage items to list.',
      required: false,
    },
  ],
  options: [
    // {
    //   name: 'tag',
    //   aliases: ['t'],
    //   description:
    //     'Only return storage items with the specified {key}={value} tag. You can specify many tags for a logical AND',
    //   type: ArgType.string,
    //   allowMany: true,
    // },
    {
      name: 'count',
      aliases: ['c'],
      description: 'The number of storage items to list at a given time',
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

export class StorageListCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new StorageListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const prefix = `${StorageService.normalizeStorageId((input.arguments[0] as string) || '')}*`;
    const output = input.options.output as string;
    const tags = (input.options.tag as string[]) || [];
    const count = input.options.count as string;
    const next = input.options.next as string;

    const options: any = {
      count,
      next,
    };

    const storageService = await StorageService.create(input);

    if (output === 'json') {
      const result = await storageService.listStorage(prefix, tags, options);
      const json = JSON.stringify(result, null, 2);
      input.io.writeLineRaw(json);
    } else {
      await input.io.writeLine();

      let getMore = true;
      let result;
      let firstDisplay = true;
      while (getMore) {
        result = await storageService.listStorage(prefix, tags, options);
        await storageService.displayStorages(result.items, firstDisplay);
        firstDisplay = false;
        getMore = result.next ? await storageService.confirmListMore() : false;
        if (getMore) {
          options.next = result.next;
        }
      }
    }

    return 0;
  }
}
