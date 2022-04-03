import { Text } from '@5qtrs/text';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { IntegrationService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Integration',
  cmd: 'rm',
  summary: 'Remove a deployed integration',
  description: 'Permanently removes a deployed integration.',
  arguments: [
    {
      name: 'integration',
      description: 'The integration id of the integration to remove',
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

export class IntegrationRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IntegrationRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const entityId = input.arguments[0] as string;

    const executeService = await ExecuteService.create(input);
    const integrationService = await IntegrationService.create(input);

    await executeService.newLine();

    await integrationService.confirmRemove(entityId);

    const result = await integrationService.removeEntity(entityId);

    if (result.status === 404) {
      await executeService.result(
        'Not Found',
        Text.create(`${integrationService.entityTypeName} '`, Text.bold(entityId), `' not found`)
      );
      return 0;
    }

    await integrationService.waitForEntity(entityId);

    await executeService.result(
      'Removed',
      Text.create(`${integrationService.entityTypeName} '`, Text.bold(entityId), `' removal completed`)
    );
    return 0;
  }
}
