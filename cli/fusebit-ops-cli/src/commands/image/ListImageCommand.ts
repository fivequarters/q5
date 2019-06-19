import { Command, IExecuteInput } from '@5qtrs/cli';
import { ImageService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Image',
  cmd: 'ls',
  summary: 'List images',
  description: 'Lists available images of the Fusebit platform',
};

// ----------------
// Exported Classes
// ----------------

export class ListImageCommand extends Command {
  public static async create() {
    return new ListImageCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const imageService = await ImageService.create(input);
    const images = await imageService.listImages();

    await imageService.displayImages(images);

    return 0;
  }
}
