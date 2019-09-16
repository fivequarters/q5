import { Command, IExecuteInput } from '@5qtrs/cli';
import { ImageService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Pull Image',
  cmd: 'pull',
  summary: 'Pull the Fusebit platform image from the global repository',
  description: 'Pulls a new Fusebit platform image from the global repository to your Fusebit deployment',
  arguments: [
    {
      name: 'tag',
      description: 'The tag of the image to pull',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class PullImageCommand extends Command {
  public static async create() {
    return new PullImageCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const tag = input.arguments[0] as string;

    const imageService = await ImageService.create(input);
    await imageService.pullImage(tag);

    return 0;
  }
}
