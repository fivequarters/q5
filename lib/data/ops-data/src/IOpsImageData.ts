import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsImage {
  repository: string;
  tag: string;
  size: number;
  updatedAt: Date;
}

export interface IOpsImageData extends IDataSource {
  publish(tag: string): Promise<void>;
  list(): Promise<IOpsImage[]>;
}
