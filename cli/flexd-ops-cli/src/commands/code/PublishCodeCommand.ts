import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { FlexdOpsCore } from '@5qtrs/flexd-ops-core';
import { DisplayService, SettingsService, ApiPublishService, ExecuteService } from '../../services';
import { Text } from '@5qtrs/text';

// ----------------
// Exported Classes
// ----------------

export class PublishCodeCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    return new PublishCodeCommand(core);
  }

  private constructor(core: FlexdOpsCore) {
    super({
      name: 'Publish Code',
      cmd: 'publish',
      summary: 'Publish code',
      description: 'Publishes the local code for a given api to the Flexd platform',
      arguments: [
        {
          name: 'api',
          description: 'The name of the api to publish the local code of',
        },
      ],
      options: [
        {
          name: 'comment',
          aliases: ['c'],
          description: 'A comment to include with the code',
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
    const api = input.arguments[0] as string;
    const comment = input.options.comment as string;

    const settingsService = await SettingsService.create(this.core, input);
    const displayService = await DisplayService.create(this.core, input);
    const publishService = await ApiPublishService.create(this.core, input);
    const executeService = await ExecuteService.create(this.core, input);

    const user = await settingsService.getUser();
    if (!user) {
      return 1;
    }

    const publishedApi = await publishService.publishApi(api, user, comment);
    if (!publishedApi) {
      return 1;
    }

    await executeService.result({
      header: 'Api Published',
      message: Text.create("The local source code for the '", Text.bold(api), "' api was successfully published."),
    });

    await displayService.displayPublishedApi([publishedApi], true);

    return 0;
  }
}
