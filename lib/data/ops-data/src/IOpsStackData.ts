import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsStack {
  id: number;
  deploymentName: string;
  tag: string;
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
  deploy(deploymentName: string, tag: string): Promise<void>;
  list(options?: IListOpsStackOptions): Promise<IListOpsStackResult>;
  listAll(deploymentName?: string): Promise<IOpsStack[]>;
}
