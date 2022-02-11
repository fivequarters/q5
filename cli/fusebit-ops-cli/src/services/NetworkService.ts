import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { IOpsNetwork, IOpsNewNetwork, IListOpsNetworkOptions, IListOpsNetworkResult } from '@5qtrs/ops-data';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { OpsDataAwsConfig } from '@5qtrs/ops-data-aws';

// ----------------
// Exported Classes
// ----------------

export class NetworkService {
  private input: IExecuteInput;
  private opsService: OpsService;
  private executeService: ExecuteService;
  private creds: IAwsCredentials;
  private opsAwsConfig: OpsDataAwsConfig;

  private constructor(
    input: IExecuteInput,
    opsService: OpsService,
    executeService: ExecuteService,
    creds: IAwsCredentials,
    opsAwsConfig: OpsDataAwsConfig
  ) {
    this.input = input;
    this.opsService = opsService;
    this.executeService = executeService;
    this.creds = creds;
    this.opsAwsConfig = opsAwsConfig;
  }

  public static async create(input: IExecuteInput) {
    const opsService = await OpsService.create(input);
    const executeService = await ExecuteService.create(input);
    const opsDataContext = await opsService.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    const opsAwsConfig = await OpsDataAwsConfig.create((await opsService.getOpsDataContextImpl()).config);
    return new NetworkService(input, opsService, executeService, credentials, opsAwsConfig);
  }

  public async checkNetworkExists(network: IOpsNewNetwork): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const networkData = opsDataContext.networkData;

    if (network.networkName.match(/^[0-9a-zA-Z]+$/) == null) {
      await this.executeService.error(
        'Invalid Name',
        `The name '${network.networkName}' uses characters outside of alphanumerics.`
      );
      throw new Error('Invalid network name');
    }

    const exists = await this.executeService.execute(
      {
        header: 'Network Check',
        message: `Determining if the '${Text.bold(network.networkName)}' network already exists...`,
        errorHeader: 'Network Error',
      },
      () => networkData.exists(network)
    );

    if (exists) {
      this.executeService.warning('Network Exists', `There is already a '${Text.bold(network.networkName)}' network`);
      throw new Error('Network already Exists');
    }
  }

  public async getNetwork(name: string, region: string): Promise<IOpsNetwork> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const networkData = opsDataContext.networkData;

    const network = await this.executeService.execute(
      {
        header: 'Get Network',
        message: `Getting the '${Text.bold(name)}' network in '${Text.bold(region)}'...`,
        errorHeader: 'Network Error',
      },
      () => networkData.get(name, region)
    );

    return network as IOpsNetwork;
  }

  public async getSingleNetwork(networkName: string, region?: string): Promise<IOpsNetwork> {
    const networks = await this.getNetworks(networkName);
    if (!networks || networks.length === 0) {
      await this.executeService.error(
        'No Network',
        Text.create(`There are no networks with the name '${Text.bold(networkName)}'`)
      );
      throw new Error('No such network');
    }
    if (networks.length > 1) {
      if (!region) {
        await this.executeService.error(
          'Many Networks',
          Text.create(`There is more than one '${Text.bold(networkName)}' network. You must specify the region.'`)
        );
        throw new Error('Unspecified network');
      }

      for (const network of networks) {
        if (network.region === region) {
          return network;
        }
      }
      await this.executeService.error(
        'No Network',
        Text.create(`There is no '${Text.bold(networkName)}' in region '${Text.bold(region)}'`)
      );
      throw new Error('No such network');
    }

    return networks[0];
  }

  public async getNetworks(networkName: string): Promise<IOpsNetwork[]> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const networkData = opsDataContext.networkData;

    const networks = await this.executeService.execute(
      {
        header: 'Get Networks',
        message: `Getting networks with the '${Text.bold(networkName)}' name...`,
        errorHeader: 'Network Error',
      },
      () => networkData.listAll(networkName)
    );

    return networks as IOpsNetwork[];
  }

  public async confirmAddNetwork(network: IOpsNewNetwork) {
    const confirmPrompt = await Confirm.create({
      header: 'Add the network to the Fusebit platform?',
      details: [
        { name: 'Network', value: network.networkName },
        { name: 'Account', value: network.accountName },
        { name: 'Region', value: network.region },
        { name: 'VPC', value: network.existingVpcId || '<create new>' },
        {
          name: 'Private Subnets',
          value: network.existingPrivateSubnetIds ? network.existingPrivateSubnetIds.join(', ') : '<create new>',
        },
        {
          name: 'Public Subnets',
          value: network.existingPublicSubnetIds ? network.existingPublicSubnetIds.join(', ') : '<create new>',
        },
      ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Add Canceled',
        Text.create('Adding the network to the Fusebit platform was canceled')
      );
      throw new Error('Add Canceled');
    }
  }

  public async addNetwork(network: IOpsNewNetwork): Promise<IOpsNetwork> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const networkData = opsDataContext.networkData;

    const networkWithNameServers = await this.executeService.execute(
      {
        header: 'Add Network',
        message: `Adding the '${Text.bold(network.networkName)}' network to the Fusebit platform...`,
        errorHeader: 'Network Error',
      },
      () => networkData.add(network)
    );

    this.executeService.result(
      'Network Added',
      `The '${Text.bold(network.networkName)}' network was successfully added to Fusebit platform`
    );

    return networkWithNameServers as IOpsNetwork;
  }

  public async listAllNetworks(): Promise<IOpsNetwork[]> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const networkData = opsDataContext.networkData;

    const result = await this.executeService.execute(
      {
        header: 'Get Networks',
        message: `Getting the networks on the Fusebit platform...`,
        errorHeader: 'Network Error',
      },
      () => networkData.listAll()
    );
    return result as IOpsNetwork[];
  }

  public async listNetworks(options?: IListOpsNetworkOptions): Promise<IListOpsNetworkResult> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const networkData = opsDataContext.networkData;

    const messages =
      options && options.next
        ? {}
        : {
            header: 'Get Networks',
            message: `Getting the networks on the Fusebit platform...`,
            errorHeader: 'Network Error',
          };

    const result = await this.executeService.execute(messages, () => networkData.list(options));
    return result as IListOpsNetworkResult;
  }

  public async confirmListMore(): Promise<boolean> {
    const confirmPrompt = await Confirm.create({ header: 'Get More Networks?' });
    return confirmPrompt.prompt(this.input.io);
  }

  public async displayNetworks(networks: IOpsNetwork[]) {
    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify(networks, null, 2));
      return;
    }

    if (networks.length == 0) {
      await this.executeService.warning('No Networks', 'There are no networks on the Fusebit platform');
      return;
    }

    await this.executeService.message(Text.cyan('Network Name'), Text.cyan('Details'));
    for (const network of networks) {
      this.writeNetworks(network);
    }
  }

  public async displayNetwork(network: IOpsNetwork) {
    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify(network, null, 2));
      return;
    }

    await this.executeService.message(Text.cyan('Network Name'), Text.cyan('Details'));
    this.writeNetworks(network);
  }

  private async writeNetworks(network: IOpsNetwork) {
    const details = [
      Text.dim('Account: '),
      network.accountName,
      Text.eol(),
      Text.dim('Region: '),
      network.region,
      Text.eol(),
    ];
    if (!network.serviceDiscovery) {
      details.push(Text.dim('Service Discovery: '), 'Missing', Text.eol());
    }
    await this.executeService.message(Text.bold(network.networkName), Text.create(details));
  }
}
