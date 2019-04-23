import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { FlexdOpsCore } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';
import { ExecuteService, DisplayService, SettingsService } from '../../services';

// ----------------
// Exported Classes
// ----------------

export class ListImageCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    return new ListImageCommand(core);
  }

  private constructor(core: FlexdOpsCore) {
    super({
      name: 'List Image',
      cmd: 'ls',
      summary: 'Lists published image',
      description: 'Lists the published image for the given api on the Flexd platform.',
      arguments: [
        {
          name: 'api',
          description: 'The name of the api to list the published image of',
        },
      ],
      options: [
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
        {
          name: 'limit',
          aliases: ['l'],
          description: 'The limit of number of entries to fetch at a time',
          type: ArgType.integer,
          default: '10',
        },
        {
          name: 'all',
          aliases: ['a'],
          description: 'If set to true, returns published image from all users',
          type: ArgType.boolean,
          default: 'false',
        },
      ],
    });
    this.core = core;
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const api = input.arguments[0] as string;
    const limit = input.options.limit as number;
    const all = input.options.all as boolean;

    const executeService = await ExecuteService.create(this.core, input);
    const settingsService = await SettingsService.create(this.core, input);
    const displayService = await DisplayService.create(this.core, input);

    let user: string;
    if (!all) {
      const user = await settingsService.getUser();
      if (!user) {
        return 1;
      }
    }

    let firstFetch = true;
    let pubilshedApis: any = { items: [], next: undefined };

    while (true) {
      pubilshedApis = await executeService.execute(
        {
          header: 'Fetching Published Image',
          message: Text.create("Fetching a list of published image for the '", Text.bold(api), "' api..."),
          errorHeader: 'Build Error',
          errorMessage: Text.create(
            "An error was encountered fetching the the list of published image for the '",
            Text.bold(api),
            "' api..."
          ),
        },
        async () => this.core.listPublishedApi(api, user, limit, pubilshedApis.next)
      );

      if (pubilshedApis === undefined) {
        return 1;
      }

      if (!pubilshedApis.items.length) {
        if (firstFetch) {
          await executeService.execute({
            header: 'No Published Image',
            message: Text.create("There is currently no published image for the '", Text.bold(api), "' api."),
          });
        }
        return 0;
      }

      await displayService.displayPublishedApi(pubilshedApis.items, true);
      if (!pubilshedApis.next || !(await input.io.prompt({ prompt: 'List more?', yesNo: true }))) {
        return 0;
      }

      firstFetch = false;
    }
  }
}
