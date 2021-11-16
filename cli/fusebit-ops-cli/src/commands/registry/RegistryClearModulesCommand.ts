import { Command, IExecuteInput } from '@5qtrs/cli';
import { RegistryService } from '../../services/RegistryService';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Clear Built Modules',
  cmd: 'clearModules',
  summary: 'Clear the module cache of modules matching a prefix',
  description:
    'Fusebit caches built npm modules to accelerate build times. This command walks the cache in S3 and removes cached artifacts that have a common prefix or scope.',
  arguments: [
    {
      name: 'deployment',
      description: 'The deployment to clear modules for.',
    },
    {
      name: 'prefix',
      description: 'Clear packages starting with this prefix.',
      defaultText: '@fusebit-int',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment; required if the network is not globally unique',
      defaultText: 'network region',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class RegistryClearModulesCommand extends Command {
  public static async create() {
    return new RegistryClearModulesCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    // Load parameters
    const [deploymentName, prefix] = input.arguments as string[];
    const region = input.options.region as string;

    // Remove entries
    const registryService = await RegistryService.create(input);
    await registryService.clearModules(deploymentName, region, prefix);

    return 0;
  }
}
