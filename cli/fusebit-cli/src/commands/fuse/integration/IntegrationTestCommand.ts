import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IntegrationService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Test Integration',
  cmd: 'test',
  summary: 'Test the integration by navigating to a simple demo application',
  description: ['Opens the demo application in a browser and creates an Integration Install for a new tenant.'].join(
    ' '
  ),
  arguments: [
    {
      name: 'integration',
      description: 'The id of the integration to test',
      required: true,
    },
  ],
  options: [
    {
      name: 'tenant',
      aliases: ['t'],
      description: 'The Tenant ID on behalf of which to test the integration',
      default: 'user-1',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class IntegrationTestCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IntegrationTestCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const entityId = input.arguments[0] as string;
    const tenantId = input.options.tenant as string;

    const executeService = await ExecuteService.create(input);
    const service = await IntegrationService.create(input);

    await executeService.newLine();

    await service.openDemoApp(entityId, tenantId);

    return 0;
  }
}
