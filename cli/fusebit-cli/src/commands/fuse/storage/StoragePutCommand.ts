import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ExecuteService, StorageService } from '../../../services';
import { Text } from '@5qtrs/text';
import { join } from 'path';
import { readFileSync } from 'fs';

// ------------------
// Internal Constants
// ------------------

const stdinFileName = '-';

const command = {
  name: 'Upsert Storage',
  cmd: 'put',
  summary: 'Upsert a storage item',
  description: Text.create('Create or update a storage item.'),
  arguments: [
    {
      name: 'file',
      description: `File name with JSON input. If ${stdinFileName} is used, data will be read from stdin`,
      required: true,
    },
  ],
  options: [
    {
      name: 'storageId',
      aliases: ['d'],
      description: 'The storageId of the storage item. If not specified, must be provided in the JSON input',
      type: ArgType.string,
    },
    {
      name: 'force',
      aliases: ['f'],
      description: 'Force override the existing storage item (turn off conflict detection)',
      type: ArgType.boolean,
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

export class StoragePutCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new StoragePutCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const file = input.arguments[0] as string;
    const storageId = input.options.storageId && (input.options.storageId as string);
    const force = input.options.force as boolean;

    const storageService = await StorageService.create(input);
    const executeService = await ExecuteService.create(input);

    const payload = await executeService.execute(
      {
        header: 'Reading data',
        message: Text.create('Reading input data from ', Text.bold(file === stdinFileName ? 'STDIN' : file), '...'),
        errorHeader: 'Data Error',
        errorMessage: Text.create('Error reading input data'),
      },
      async () => {
        const readStdin = async () => {
          const chunks = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks).toString('utf8');
        };
        const content = file === stdinFileName ? await readStdin() : readFileSync(join(process.cwd(), file), 'utf8');
        const json = JSON.parse(content);
        if (typeof json !== 'object') {
          throw new Error('The input data must be a JSON object.');
        }
        if (!storageId && typeof json.storageId !== 'string') {
          throw new Error(
            `If the JSON object does not have the 'storageId' property, the --storageId option must be used.`
          );
        }
        if (json.etag !== undefined && typeof json.etag !== 'string') {
          throw new Error(`The 'etag' property, if specified, must be a string.`);
        }
        if (json.tags !== undefined && typeof json.tags !== 'object') {
          throw new Error(`The 'tags' property, if specified, must be an object.`);
        }
        if (json.tags) {
          Object.keys(json.tags).forEach((k) => {
            if (typeof json.tags[k] !== 'string') {
              throw new Error(`The 'tags.${k}' property must be a string.`);
            }
          });
        }
        if (json.expires !== undefined && typeof json.expires !== 'string') {
          throw new Error(`The 'expires' property, if specified, must be an ISO date.`);
        }
        if (!json.data) {
          throw new Error(`The 'data' property is required.`);
        }
        const result: any = {
          storageId: StorageService.normalizeStorageId(storageId || json.storageId, true),
          data: json.data,
        };
        if (json.tags) {
          result.tags = json.tags;
        }
        if (json.etag && !force) {
          result.etag = json.etag;
        }
        if (json.expires) {
          result.expires = json.expires;
        }
        return result;
      }
    );

    const putResult = await storageService.putStorage(payload);
    const jsonResult = JSON.stringify(putResult, null, 2);
    await input.io.writeLineRaw(jsonResult);

    return 0;
  }
}
