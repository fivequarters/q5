import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsNewStack {
  deploymentName: string;
  tag: string;
  size?: number;
}

export interface IOpsStack extends IOpsNewStack {
  id: number;
  size: number;
  active: boolean;
}

export interface IListOpsStackOptions {
  deploymentName?: string;
  next?: string;
  limit?: number;
}

export interface IListOpsStackResult {
  next?: string;
  items: IOpsStack[];
}

export interface IOpsStackData extends IDataSource {
  deploy(stack: IOpsNewStack): Promise<IOpsStack>;
  get(deploymentName: string, id: number): Promise<IOpsStack>;
  promote(deploymentName: string, id: number): Promise<IOpsStack>;
  demote(deploymentName: string, id: number, force?: boolean): Promise<IOpsStack>;
  remove(deploymentName: string, id: number, force?: boolean): Promise<void>;
  list(options?: IListOpsStackOptions): Promise<IListOpsStackResult>;
  listAll(deploymentName?: string): Promise<IOpsStack[]>;
}
