import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ImageService } from '../../services';
import { Text } from '@5qtrs/text';

// ----------------
// Internal Classes
// ----------------

const command = {
  name: 'Image Deploy',
  cmd: 'deploy',
  summary: 'Deploy the image',
  description: 'Deploys the image to a given deployment.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the deployment',
    },
    {
      name: 'tag',
      description: 'The tag of the image to deploy',
    },
  ],
  options: [
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before adding the deployment to the Fusebit platform',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class DeployImageCommand extends Command {
  public static async create() {
    return new DeployImageCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [deploymentName, tag] = input.arguments as string[];

    const imageService = await ImageService.create(input);

    await imageService.deploy(deploymentName, tag);

    return 0;
  }
}
