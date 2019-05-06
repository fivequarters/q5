import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { IOpsNetwork, IOpsNewNetwork, IListOpsNetworkOptions, IListOpsNetworkResult } from '@5qtrs/ops-data';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';

// ----------------
// Exported Classes
// ----------------

export class NetworkService {
  private input: IExecuteInput;
  private opsService: OpsService;
  private executeService: ExecuteService;

  private constructor(input: IExecuteInput, opsService: OpsService, executeService: ExecuteService) {
    this.input = input;
    this.opsService = opsService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const opsService = await OpsService.create(input);
    const executeService = await ExecuteService.create(input);
    return new NetworkService(input, opsService, executeService);
  }

  public async checkNetworkExists(network: IOpsNewNetwork): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const networkData = opsDataContext.networkData;

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
      throw Error('Network already Exists');
    }
  }

  public async getNetwork(name: string): Promise<IOpsNetwork> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const networkData = opsDataContext.networkData;

    const network = await this.executeService.execute(
      {
        header: 'Get Network',
        message: `Getting the '${Text.bold(name)}' network...`,
        errorHeader: 'Network Error',
      },
      () => networkData.get(name)
    );

    return network as IOpsNetwork;
  }

  public async confirmAddNetwork(network: IOpsNewNetwork) {
    const confirmPrompt = await Confirm.create({
      header: 'Add the network to the Fusebit platform?',
      details: [
        { name: 'Network', value: network.networkName },
        { name: 'Account', value: network.accountName },
        { name: 'Region', value: network.region },
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
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(networks, null, 2));
      return;
    }

    if (networks.length == 0) {
      await this.executeService.warning('No Networks', 'There are no networks on the Fusebit platform');
      return;
    }

    await this.executeService.message(Text.blue('Network Name'), Text.blue('Details'));
    for (const network of networks) {
      this.writeNetworks(network);
    }
  }

  public async displayNetwork(network: IOpsNetwork) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(network, null, 2));
      return;
    }

    await this.executeService.message(Text.blue('Network Name'), Text.blue('Details'));
    this.writeNetworks(network);
  }

  private async writeNetworks(network: IOpsNetwork) {
    const details = [Text.dim('Account: '), network.accountName, Text.eol(), Text.dim('Region: '), network.region];

    await this.executeService.message(Text.bold(network.networkName), Text.create(details));
  }
}
