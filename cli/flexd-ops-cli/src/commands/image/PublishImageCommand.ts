import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { FlexdOpsCore } from '@5qtrs/flexd-ops-core';
import { ExecuteService } from '../../services';
import { Text } from '@5qtrs/text';

// ----------------
// Exported Classes
// ----------------

export class PublishImageCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    return new PublishImageCommand(core);
  }

  private constructor(core: FlexdOpsCore) {
    super({
      name: 'Publish Image',
      cmd: 'publish',
      summary: 'Publish image',
      description: 'Publishes the local image for a given api to the Flexd platform',
      arguments: [
        {
          name: 'image',
          description: "The image to publish in the form of '{repo}:{tag}'",
        },
      ],
      options: [
        {
          name: 'comment',
          aliases: ['c'],
          description: 'A comment to include with the image',
        },
        {
          name: 'quiet',
          aliases: ['q'],
          description: 'Only write the result to stdout',
          type: ArgType.boolean,
          default: 'false',
        },
        {
          name: 'format',
          aliases: ['f'],
          description: "The format to display the output: 'table', 'json'",
          default: 'table',
        },
      ],
    });
    this.core = core;
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const image = input.arguments[0] as string;
    const [repo, tag] = image.split(':');

    const executeService = await ExecuteService.create(this.core, input);

    const imagepublished = await executeService.execute(
      {
        header: 'Publish Image',
        message: Text.create(
          "Publishing the local image with '",
          Text.bold(tag),
          "' tag to the '",
          Text.bold(repo),
          "' repository."
        ),
        errorHeader: 'Publish Error',
        errorMessage: Text.create('An error was encountered when trying to publish the image. '),
      },
      async () => {
        await this.core.pushImage(repo, tag);
        return true;
      }
    );

    if (!imagepublished) {
      return 1;
    }

    await executeService.result({
      header: 'Image Published',
      message: Text.create(
        "The local image with '",
        Text.bold(tag),
        "' tag was successfully published to the '",
        Text.bold(repo),
        "' repository."
      ),
    });

    return 0;
  }
}
