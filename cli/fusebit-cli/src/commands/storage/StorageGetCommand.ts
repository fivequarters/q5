import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, StorageService } from '../../services';
import { join } from 'path';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Storage',
  cmd: 'get',
  summary: 'Get a storage',
  description: Text.create('Get a storage value.'),
  arguments: [
    {
      name: 'storage',
      description: 'The id of the storage to fetch',
      required: true,
    },
  ],
  options: [],
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
    const storageId = input.arguments[0] as string;

    const storageService = await StorageService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const storage = { storageId, ...(await storageService.fetchStorage(storageId)) };

    await storageService.displayStorage(storage);

    return 0;
  }
}
