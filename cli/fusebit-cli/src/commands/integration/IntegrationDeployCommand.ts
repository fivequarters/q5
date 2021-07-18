import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IntegrationService, OperationService } from '../../services';
import { join } from 'path';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Deploy Integration',
  cmd: 'deploy',
  summary: 'Deploy an integration',
  description: Text.create('Builds and deploys an integration using the project files in the given directory.'),
  arguments: [
    {
      name: 'integration',
      description: 'The id of the integration to deploy.',
      required: true,
    },
  ],
  options: [
    {
      name: 'dir',
      aliases: ['d'],
      description: 'A path to the directory with the integration source code to deploy.',
      defaultText: 'current directory',
    },
    {
      name: 'ignore',
      aliases: ['i'],
      description: 'A file or directory to ignore; you can specify this option multiple times.',
      type: ArgType.string,
      allowMany: true,
    },
    {
      name: 'fast',
      aliases: ['f'],
      description: 'If set to true, does not wait for the integration to initialize.',
      type: ArgType.boolean,
      default: 'false',
    },
    {
      name: 'quiet',
      aliases: ['q'],
      description: 'If set to true, does not prompt for confirmation.',
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

export class IntegrationDeployCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IntegrationDeployCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const integrationId = input.arguments[0] as string;
    const sourceDir = input.options.dir as string;
    const fast = input.options.fast as boolean;

    const integrationService = await IntegrationService.create(input);
    const operationService = await OperationService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const sourcePath = sourceDir ? join(process.cwd(), sourceDir) : process.cwd();
    const integrationSpec = await integrationService.loadDirectory(sourcePath);

    await integrationService.confirmDeploy(sourcePath, integrationSpec, integrationId);

    const operation = await integrationService.deployEntity(integrationId, integrationSpec);
    if (!fast) {
      const result = await operationService.waitForCompletion(operation.operationId);
      await operationService.displayOperationResults(result);
    } else {
      await operationService.displayOperation(operation.operationId);
    }

    return 0;
  }
}
