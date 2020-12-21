import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { PortalService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Portals',
  cmd: 'ls',
  summary: 'List Fusebit Portals',
  description: 'Lists existing Fusebit Portals.',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ListPortalCommand extends Command {
  public static async create() {
    return new ListPortalCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const portalService = await PortalService.create(input);
    const portals = await portalService.listPortals();
    await portalService.displayPortals(portals);

    return 0;
  }
}
