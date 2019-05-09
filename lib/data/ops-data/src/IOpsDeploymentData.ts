import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsDeployment {
  deploymentName: string;
  networkName: string;
  domainName: string;
  size: number;
  dataWarehouseEnabled: boolean;
}

export interface IListOpsDeploymentOptions {
  next?: string;
  limit?: number;
}

export interface IListOpsDeploymentResult {
  next?: string;
  items: IOpsDeployment[];
}

export interface IOpsDeploymentData extends IDataSource {
  exists(deployment: IOpsDeployment): Promise<boolean>;
  add(deployment: IOpsDeployment): Promise<void>;
  get(deploymentName: string): Promise<IOpsDeployment>;
  list(options?: IListOpsDeploymentOptions): Promise<IListOpsDeploymentResult>;
  listAll(): Promise<IOpsDeployment[]>;
}
