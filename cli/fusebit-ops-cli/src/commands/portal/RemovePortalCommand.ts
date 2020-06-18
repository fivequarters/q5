import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { PortalService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Portal',
  cmd: 'rm',
  summary: 'Remove a Fusebit Portal',
  description: 'Removes an existing Fusebit Portal.',
  arguments: [
    {
      name: 'domain',
      description: 'The DNS domain name of the portal',
    },
  ],
  options: [
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before deploying or updatig the portal',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class RemovePortalCommand extends Command {
  public static async create() {
    return new RemovePortalCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [domain] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const portalService = await PortalService.create(input);

    if (confirm) {
      await portalService.confirmRemovePortal(domain);
    }

    await portalService.removePortal(domain);

    return 0;
  }
}
