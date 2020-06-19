import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { PortalService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Deploy Portal',
  cmd: 'deploy',
  summary: 'Deploy or update Fusebit Portal',
  description: 'Deploys a Fusebit Portal or updates existing portal configuration',
  arguments: [
    {
      name: 'domain',
      description: 'The DNS domain name of the portal',
    },
    {
      name: 'version',
      description: 'The semver of the Fusebit Portal version to deploy, or "latest" to deploy the latest version',
    },
    {
      name: 'configUrl',
      description:
        'The URL of the portal configuration service. Can be a relative URL if used in conjunction with --file',
    },
  ],
  options: [
    {
      name: 'file',
      description: 'Local file to deploy as a static file at the root of the portal',
      allowMany: true,
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'Do not prompt for confirmation before deploying or updating the portal',
      type: ArgType.boolean,
      default: 'true',
    },
    {
      name: 'format',
      aliases: ['f'],
      description: "The format to display the output: 'table', 'json'",
      default: 'table',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class DeployPortalCommand extends Command {
  public static async create() {
    return new DeployPortalCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [domain, version, configUrl] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const portalService = await PortalService.create(input);

    const portal = {
      domain,
      rootDomain: await portalService.getRootDomain(domain),
      version,
      configUrl,
      files: Array.isArray(input.options.file) ? (input.options.file as string[]) : [],
    };

    if (confirm) {
      await portalService.confirmDeployPortal(portal);
    }

    await portalService.deployPortal(portal);
    await portalService.displayPortal(portal);

    return 0;
  }
}
