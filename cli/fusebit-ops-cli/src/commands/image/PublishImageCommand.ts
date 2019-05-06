import { Command, IExecuteInput } from '@5qtrs/cli';
import { ImageService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Publish Image',
  cmd: 'publish',
  summary: 'Publish fusebit-mono image',
  description: 'Publishes the fusebit-mono image to the Fusebit platform',
  arguments: [
    {
      name: 'tag',
      description: 'The tag to publish the fusebit-mono image with',
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
    await imageService.publish(tag);

    return 0;
  }
}
