import { Text } from '@5qtrs/text';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { IntegrationService, OperationService, ExecuteService } from '../../services';

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
    const operationService = await OperationService.create(input);

    await executeService.newLine();

    await integrationService.confirmRemove(entityId);

    const operation = await integrationService.removeEntity(entityId);

    const result = await operationService.waitForCompletion(operation.operationId);
    await executeService.result(
      'Entity Removed',
      Text.create("Entity '", Text.bold(entityId), `' removal completed: ${result.status}`)
    );

    return 0;
  }
}
