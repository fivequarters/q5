import * as fs from 'fs';

import * as superagent from 'superagent';
import { asyncPool } from '@5qtrs/constants';
import { ArgType, Command, IExecuteInput } from '@5qtrs/cli';
import { IAccount } from '@5qtrs/account-data';
import { IOpsDeployment } from '@5qtrs/ops-data';
import { ExecuteService, AssumeService, OpsService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Populate Grafana Defaults',
  cmd: 'populateGrafana',
  summary: 'Populate the Grafana defaults for every account in a deployment',
  description: 'Populate or reset-to-defaults the grafana configurations for every account in a deployment.',
  arguments: [
    {
      name: 'deployment',
      description: 'The deployment to populate.',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment; required if the network is not globally unique',
      defaultText: 'network region',
    },
    {
      name: 'dashboards',
      description: 'A file containing extra dashboards, in a JSON array, to deploy',
      defaultText: 'dashboards.json',
    },
    {
      name: 'account',
      description: 'A single accountId to deploy to, for use when testing updated dashboards',
      defaultText: 'acc-1234567812345678',
    },

    // Common options across all actions
    {
      name: 'dry-run',
      aliases: ['n'],
      description: 'Evaluate an action without making any changes.',
      type: ArgType.boolean,
      default: 'false',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class PopulateGrafanaDefaultsCommand extends Command {
  public static async create() {
    return new PopulateGrafanaDefaultsCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const executeService = await ExecuteService.create(input);

    const [deploymentName] = input.arguments as string[];
    let region = input.options.region as string;
    const dryRun = input.options['dry-run'] as boolean | undefined;
    const confirm = input.options.confirm as boolean | undefined;
    const dashboardFile = input.options.dashboards as string | undefined;
    const accountId = input.options.account as string | undefined;

    // Get the deployment
    const opsService = await OpsService.create(input);
    const opsDataContext = await opsService.getOpsDataContextImpl();
    const deploymentData = opsDataContext.deploymentData;

    let deployment: IOpsDeployment;

    if (!region) {
      const deployments = await deploymentData.listAll(deploymentName);
      if (deployments.length === 0) {
        // Error on deployment not found.
        await executeService.warning('Deployment Not Found', `Deployment ${deploymentName} not found`);
        return 1;
      } else if (deployments.length > 1) {
        // Error on required region.
        await executeService.warning(
          'Ambiguous Deployments',
          `Multiple deployments named '${deploymentName}' found, select the region desired: ${deployments.map(
            (d) => d.region
          )}`
        );
        return 1;
      }
      deployment = deployments[0];
      region = deployments[0].region;
    } else {
      deployment = await deploymentData.get(deploymentName, region);
      if (!deployment) {
        await executeService.warning('Deployment Not Found', `Deployment ${deploymentName} not found in ${region}`);
        return 1;
      }
    }

    // Get all of the the acounts.
    await executeService.info('Setup', `Loading accounts...`);
    const accounts = accountId ? [{ id: accountId }] : await deploymentData.listAllAccounts(deployment);

    await executeService.info('Setup', `Found ${accounts.length} accounts`);

    const service = await AssumeService.create(input);

    const { jwt } = await service.createMasterAuthBundle(deployment);

    const payload: { dashboards?: any[] } = {};
    if (dashboardFile) {
      payload.dashboards = JSON.parse(fs.readFileSync(dashboardFile, 'utf8'));
    }

    await executeService.info('Setup', `Created master credential for deployment ${deploymentName}:${region}`);

    await executeService.info('In Progress', `Issuing /v2/account/:id/grafana commands`);

    const initialize = async (account: IAccount): Promise<{ statusCode: number }> => {
      if (!account.id) {
        return { statusCode: 404 };
      }
      const url =
        process.env.FUSEBIT_API_ENDPOINT?.replace('{{accountId}}', account.id) ||
        `https://${deployment.deploymentName}.${deployment.region}.${deployment.domainName}/v2/account/${account.id}/grafana`;
      // Useful debugging command, saving for later
      //   console.log( `curl -H"Content-Type: application/json" -H"Authorization: Bearer ${jwt}" -XPOST ${url} -d '${JSON.stringify( payload)}'`);
      return dryRun
        ? { statusCode: 200 }
        : superagent
            .post(url)
            .set('Authorization', `Bearer ${jwt}`)
            .send(payload)
            .ok(() => true);
    };

    const results = await asyncPool(2, accounts, initialize);

    const codes = results.map((result: superagent.Response) => result.statusCode);
    const codeList = codes.reduce((prev: Record<number, number>, code: number) => {
      prev[code] = (prev[code] || 0) + 1;
      return prev;
    }, {});

    await executeService.result('Completed', `${JSON.stringify(codeList)}`);

    return 0;
  }
}
