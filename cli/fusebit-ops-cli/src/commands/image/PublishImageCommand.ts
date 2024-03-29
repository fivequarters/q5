import { Command, IExecuteInput } from '@5qtrs/cli';
import { ImageService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Publish Image',
  cmd: 'publish',
  summary: 'Publish the Fusebit platform image',
  description: 'Publishes the new image to the Fusebit platform',
  arguments: [
    {
      name: 'tag',
      description: 'The tag to publish the image with',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class PublishImageCommand extends Command {
  public static async create() {
    return new PublishImageCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const tag = input.arguments[0] as string;

    const imageService = await ImageService.create(input);
    await imageService.publishImage(tag);

    return 0;
  }
}
