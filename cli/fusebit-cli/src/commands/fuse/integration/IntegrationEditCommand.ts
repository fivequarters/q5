import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IntegrationService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Edit Integration',
  cmd: 'edit',
  summary: 'Edit an integration in the Fusebit editor',
  description: ['Opens the Fusebit Editor in your default browser to edit an integration.'].join(' '),
  arguments: [
    {
      name: 'integration',
      description: 'The id of the integration to edit',
      required: true,
    },
  ],
  options: [
    {
      name: 'theme',
      aliases: ['m'],
      description: "The theme of the editor: 'light' or 'dark'",
      default: 'light',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class IntegrationEditCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IntegrationEditCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const entityId = input.arguments[0] as string;
    const theme = input.options.theme as string;

    const executeService = await ExecuteService.create(input);
    const service = await IntegrationService.create(input);

    await executeService.newLine();

    await service.startEditServer(entityId, theme);

    return 0;
  }
}
