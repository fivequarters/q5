import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsNewStack {
  deploymentName: string;
  region: string;
  tag: string;
  size?: number;
  env?: string;
  ami?: string;
  disableHealthCheck?: boolean;
}

export interface IOpsStack extends IOpsNewStack {
  id: number;
  size: number;
  active: boolean;
  fuseopsVersion: string;
}

export interface IListOpsStackOptions {
  deploymentName?: string;
  region?: string;
  next?: string;
  limit?: number;
}

export interface IListOpsStackResult {
  next?: string;
  items: IOpsStack[];
}

export interface IOpsStackData extends IDataSource {
  deploy(stack: IOpsNewStack): Promise<IOpsStack>;
  get(deploymentName: string, region: string, id: number): Promise<IOpsStack>;
  promote(deploymentName: string, region: string, id: number): Promise<IOpsStack>;
  demote(deploymentName: string, region: string, id: number, force?: boolean): Promise<IOpsStack>;
  remove(deploymentName: string, region: string, id: number, force?: boolean): Promise<void>;
  list(options?: IListOpsStackOptions): Promise<IListOpsStackResult>;
  listAll(options?: IListOpsStackOptions): Promise<IOpsStack[]>;
}
