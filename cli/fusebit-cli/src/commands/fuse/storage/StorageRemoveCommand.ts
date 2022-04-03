import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { StorageService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Storage',
  cmd: 'rm',
  summary: 'Remove a storage item',
  description: 'Permanently removes a storage item.',
  arguments: [
    {
      name: 'storageId',
      description: 'The storageId of the storage item to remove',
      required: true,
    },
  ],
  options: [
    {
      name: 'quiet',
      aliases: ['q'],
      description: 'If set to true, does not prompt for confirmation',
      type: ArgType.boolean,
      default: 'false',
    },
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

export class StorageRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new StorageRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const storageId = StorageService.normalizeStorageId(input.arguments[0] as string);

    const executeService = await ExecuteService.create(input);
    const storageService = await StorageService.create(input);

    await executeService.newLine();

    await storageService.confirmRemove(storageId);

    await storageService.removeStorage(storageId);

    return 0;
  }
}
