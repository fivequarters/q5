import { Command, IExecuteInput, ArgType, ICommand } from '@5qtrs/cli';
import { IEntityCommandOptions } from './EntityCommandOptions';
import { EntityService } from '../../../services/EntityService';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const createCommand = (options: IEntityCommandOptions) => ({
  name: `List ${options.capitalPlural}`,
  cmd: 'ls',
  summary: `List ${options.plural}`,
  description: `Lists ${options.plural} of a specific ${options.parentName}.`,
  arguments: [
    {
      name: `${options.parentName}Id`,
      description: `The id of the ${options.parentName}.`,
      required: true,
    },
  ],
  options: [
    {
      name: 'tenant',
      aliases: ['t'],
      description: `Only return ${options.plural} associated with the specific tenant`,
      type: ArgType.string,
    },
    {
      name: 'tag',
      description: `Only return ${options.plural} with the specified {key}={value} tag. You can specify many tags for a logical AND`,
      type: ArgType.string,
      allowMany: true,
    },
    {
      name: 'count',
      aliases: ['c'],
      description: `The number of ${options.plural} to list at a given time`,
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
});

// ----------------
// Exported Classes
// ----------------

export class EntityListCommand extends Command {
  private entityOptions: IEntityCommandOptions;

  private constructor(options: IEntityCommandOptions) {
    super(createCommand(options));
    this.entityOptions = options;
  }

  public static async create(options: IEntityCommandOptions) {
    return new EntityListCommand(options);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const parentEntityId = input.arguments[0] as string;

    const output = input.options.output as string;
    const tags = (input.options.tag as string[]) || [];
    const tenant = input.options.tenant as string;
    if (tenant) {
      tags.push(`fusebit.tenantId=${tenant}`);
    }
    const count = input.options.count as string;
    const next = input.options.next as string;

    const options: any = {
      count,
      next,
    };

    const entityService = await EntityService.create(input, this.entityOptions);

    let result = await entityService.listEntities(parentEntityId, tags, options);

    if (output === 'json') {
      const json = JSON.stringify(result, null, 2);
      input.io.writeLineRaw(json);
      return 0;
    }

    await input.io.writeLine();

    let getMore = true;
    let firstDisplay = true;
    while (getMore) {
      await entityService.displayEntities(result.items, firstDisplay);
      firstDisplay = false;
      getMore = result.next ? await entityService.confirmListMore() : false;
      if (getMore) {
        options.next = result.next;
        result = await entityService.listEntities(parentEntityId, tags, options);
      }
    }

    return 0;
  }
}
