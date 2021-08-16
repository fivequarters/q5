import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DeploymentService, NetworkService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Deployment',
  cmd: 'add',
  summary: 'Add a deployment',
  description: 'Adds a new deployment to the Fusebit platform.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the new deployment',
    },
    {
      name: 'network',
      description: 'The network to add the deployment to',
    },
    {
      name: 'domain',
      description: 'The domain where the deployment should be hosted',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment; required if the network is not globally unique',
      defaultText: 'network region',
    },
    {
      name: 'size',
      description: 'The default number of instances to include in stacks of the deployment',
      type: ArgType.integer,
      // No default, to preserve the existing value when updating a deployment.
    },
    {
      name: 'segmentKey',
      description: 'The Write Key to use when offloading analytic data to Segment',
      type: ArgType.string,
      // No default, to preserve the existing value when updating a deployment.
    },
    {
      name: 'elasticSearch',
      description:
        'The Elastic Search endpoint for monitoring and analytics\n\n' +
        'There are several different modes to this parameter:\n' +
        '  1. Format: https://user:password@hostname - use this existing ES, and configure it to support Fusebit.\n' +
        '  2. Format: ./path_to_es.json - Supply this path to automatically create an ES cluster based on the supplied configuration file.\n' +
        "  3. Format: '' - Clear the existing configuration value.\n" +
        '\n' +
        'NOTE: The second mode has no action if the deployment is already configured with a value that matches the first mode.  Force the creation of a new cluster by first clearing the value using the third mode.',
      // No default, to preserve the existing value when updating a deployment.
    },
    {
      name: 'generateElasticSearchConfig',
      description:
        'Output an ElasticSearch configuration skeleton to the specified filename. This generates an initial template to pass to --elasticSearch to create an ElasticSearch deployment.',
      type: ArgType.string,
    },
    {
      name: 'dataWarehouse',
      description: 'If set to true, the deployment will export data to the data warehouse',
      type: ArgType.boolean,
      // No default, to preserve the existing value when updating a deployment.
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before adding the deployment to the Fusebit platform',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class AddDeploymentCommand extends Command {
  public static async create() {
    return new AddDeploymentCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [deploymentName, networkName, domainName] = input.arguments as string[];
    const region = input.options.region as string;
    const size = input.options.size as number | undefined;
    const segmentKey = input.options.segmentKey as string | undefined;
    const elasticSearch = input.options.elasticSearch as string | undefined;
    const generateElasticSearchConfig = input.options.generateElasticSearchConfig as string | undefined;
    const confirm = input.options.confirm as boolean;
    const dataWarehouseEnabled = input.options.dataWarehouse as boolean | undefined;

    const deploymentService = await DeploymentService.create(input);
    const networkService = await NetworkService.create(input);

    const network = await networkService.getSingleNetwork(networkName, region);

    const deploymentParameters = {
      deploymentName,
      networkName,
      domainName,
      size,
      segmentKey,
      elasticSearch,
      dataWarehouseEnabled,
      region: network.region,
      featureUseDnsS3Bucket: true,
    };

    if (generateElasticSearchConfig) {
      await deploymentService.getElasticSearchTemplate(deploymentParameters, generateElasticSearchConfig);
      return 0;
    }

    const [deployment, exists] = await deploymentService.checkDeploymentExists(deploymentParameters);

    if (!exists) {
      if (confirm) {
        await deploymentService.confirmAddDeployment(deployment);
      }

      const addedDeployment = await deploymentService.addDeployment(deployment);
      await deploymentService.displayDeployment(addedDeployment);
    }

    return 0;
  }
}
