import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsImageData extends IDataSource {
  publish(tag: string): Promise<void>;
  deploy(deploymentName: string, tag: string): Promise<void>;
}
