import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsNewNetwork {
  networkName: string;
  accountName: string;
  region: string;
  existingVpcId?: string;
  existingPublicSubnetIds?: string[];
  existingPrivateSubnetIds?: string[];
}

export interface IOpsNetwork extends IOpsNewNetwork {
  vpcId: string;
  securityGroupId: string;
  lambdaSecurityGroupId: string;
  publicSubnets: IOpsSubnetDetail[];
  privateSubnets: IOpsSubnetDetail[];
  serviceDiscovery: boolean;
}

export interface IOpsSubnetDetail {
  id: string;
  availabilityZone: string;
}

export interface IListOpsNetworkOptions {
  networkName?: string;
  next?: string;
  limit?: number;
}

export interface IListOpsNetworkResult {
  next?: string;
  items: IOpsNetwork[];
}

export interface IOpsNetworkData extends IDataSource {
  exists(network: IOpsNewNetwork): Promise<boolean>;
  add(network: IOpsNewNetwork): Promise<IOpsNetwork>;
  get(networkName: string, region: string): Promise<IOpsNetwork>;
  list(options?: IListOpsNetworkOptions): Promise<IListOpsNetworkResult>;
  listAll(networkName?: string): Promise<IOpsNetwork[]>;
}
