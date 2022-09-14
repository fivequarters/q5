import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, StorageService } from '../../../services';
import { IEntityCommandOptions } from './EntityCommandOptions';
import { EntityService } from '../../../services/EntityService';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const createCommand = (options: IEntityCommandOptions) => ({
  name: `Get ${options.capitalPlural}`,
  cmd: 'get',
  summary: `Get an ${options.singular}`,
  description: Text.create(`Get the ${options.singular} value.`),
  arguments: [
    {
      name: `${options.parentName}Id`,
      description: `The id of the ${options.parentName}.`,
      required: true,
    },
    {
      name: `${options.singular}Id`,
      description: `The id of the ${options.singular}`,
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
});

// ----------------
// Exported Classes
// ----------------

export class EntityGetCommand extends Command {
  private entityOptions: IEntityCommandOptions;

  private constructor(options: IEntityCommandOptions) {
    super(createCommand(options));
    this.entityOptions = options;
  }

  public static async create(options: IEntityCommandOptions) {
    return new EntityGetCommand(options);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const parentEntityId = input.arguments[0] as string;
    const entityId = input.arguments[1] as string;
    const output = input.options.output as string;

    const entityService = await EntityService.create(input, this.entityOptions);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const entity = {
      id: entityId,
      ...(await entityService.fetchEntity(parentEntityId, entityId)),
    };

    if (output === 'json') {
      const json = JSON.stringify(entity, null, 2);
      input.io.writeLineRaw(json);
    } else {
      await entityService.displayEntity(entity);
    }

    return 0;
  }
}
