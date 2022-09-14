import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IntegrationService } from '../../../services';
import { join } from 'path';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Integration',
  cmd: 'get',
  summary: 'Get an integration',
  description: Text.create('Get an integration and place it into the target directory.'),
  arguments: [
    {
      name: 'integration',
      description: 'The id of the integration to get',
      required: true,
    },
  ],
  options: [
    {
      name: 'dir',
      aliases: ['d'],
      description: 'A relative path to the directory to place the integration code.',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class IntegrationGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IntegrationGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const integrationId = input.arguments[0] as string;
    const destDir = input.options.dir as string;

    const integrationService = await IntegrationService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const integration = await integrationService.fetchEntity(integrationId);

    if (destDir) {
      const destPath = join(process.cwd(), destDir);
      await integrationService.writeDirectory(destPath, integration);
    } else {
      await integrationService.displayEntities([integration], true);
    }
    return 0;
  }
}
