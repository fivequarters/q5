import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService } from '../../../services';
import { IEntityCommandOptions } from '../../common/entity/EntityCommandOptions';
import { EntityService, FusebitTenantTag } from '../../../services/EntityService';

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

const installEntityOptions = {
  singular: 'install',
  capitalSingular: 'Install',
  plural: 'installs',
  capitalPlural: 'Installs',
  parentName: 'integration',
  parentEntityUrlSegment: 'integration',
  tenantName: 'Tenant',
  tenantTag: FusebitTenantTag,
  entityUrlSegment: 'install',
};

// ----------------
// Exported Classes
// ----------------

export class IdentityRemoveCommand extends Command {
  private entityOptions: IEntityCommandOptions;

  private constructor(options: IEntityCommandOptions) {
    super(createCommand(options));
    this.entityOptions = options;
  }

  public static async create(options: IEntityCommandOptions) {
    return new IdentityRemoveCommand(options);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const parentEntityId = input.arguments[0] as string;
    const entityId = input.arguments[1] as string;

    const executeService = await ExecuteService.create(input);
    const entityService = await EntityService.create(input, this.entityOptions);
    const installService = await EntityService.create(input, installEntityOptions);

    await executeService.newLine();

    const identity = await entityService.fetchEntity(parentEntityId, entityId);
    const session = identity.tags['session.master'] as string;
    const install = await installService.listEntities('everyauth', [`session.master=${session}`], {});

    await entityService.confirmRemove(parentEntityId, entityId);

    await entityService.removeEntity(parentEntityId, entityId);
    if (install.items.length !== 1) {
      await executeService.error(
        'Error',
        `Incorrect number (${install.items.length}) of installs matched ${session}; contact support for assistance.`
      );
    }

    await installService.removeEntity('everyauth', install.items[0].id);

    return 0;
  }
}
