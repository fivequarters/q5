import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService } from '../../../services';
import { IEntityCommandOptions } from './EntityCommandOptions';
import { EntityService } from '../../../services/EntityService';

// ------------------
// Internal Constants
// ------------------

const createCommand = (options: IEntityCommandOptions) => ({
  name: `Remove ${options.capitalSingular}`,
  cmd: 'rm',
  summary: `Remove an ${options.singular}`,
  description: `Permanently removes an ${options.singular}`,
  arguments: [
    {
      name: `${options.parentEntityUrlSegment}Id`,
      description: `The id of the ${options.parentEntityUrlSegment}.`,
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
});

// ----------------
// Exported Classes
// ----------------

export class EntityRemoveCommand extends Command {
  private entityOptions: IEntityCommandOptions;

  private constructor(options: IEntityCommandOptions) {
    super(createCommand(options));
    this.entityOptions = options;
  }

  public static async create(options: IEntityCommandOptions) {
    return new EntityRemoveCommand(options);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const parentEntityId = input.arguments[0] as string;
    const entityId = input.arguments[1] as string;

    const executeService = await ExecuteService.create(input);
    const entityService = await EntityService.create(input, this.entityOptions);

    await executeService.newLine();

    await entityService.confirmRemove(parentEntityId, entityId);

    await entityService.removeEntity(parentEntityId, entityId);

    return 0;
  }
}
