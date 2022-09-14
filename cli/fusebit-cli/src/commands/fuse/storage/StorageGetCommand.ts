import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, StorageService } from '../../../services';
import { join } from 'path';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Storage',
  cmd: 'get',
  summary: 'Get a storage item',
  description: Text.create('Get a storage value.'),
  arguments: [
    {
      name: 'storageId',
      description: 'The id of the storage item to fetch',
      required: true,
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

export class StorageGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new StorageGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const storageId = StorageService.normalizeStorageId(input.arguments[0] as string);
    const output = input.options.output as string;

    const storageService = await StorageService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const storage = {
      storageId: StorageService.normalizeStorageId(storageId, true),
      tags: {},
      ...(await storageService.fetchStorage(storageId)),
    };

    if (output === 'json') {
      const json = JSON.stringify(storage, null, 2);
      input.io.writeLineRaw(json);
    } else {
      await storageService.displayStorage(storage);
    }

    return 0;
  }
}
