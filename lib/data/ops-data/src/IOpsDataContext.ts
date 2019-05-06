import { IDataSource } from '@5qtrs/data';
import { IConfig } from '@5qtrs/config';
import { IOpsAccountData } from './IOpsAccountData';
import { IOpsDomainData } from './IOpsDomainData';
import { IOpsNetworkData } from './IOpsNetworkData';
import { IOpsImageData } from './IOpsImageData';
import { IOpsDeploymentData } from './IOpsDeploymentData';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsDataContext extends IDataSource {
  readonly accountData: IOpsAccountData;
  readonly domainData: IOpsDomainData;
  readonly networkData: IOpsNetworkData;
  readonly imageData: IOpsImageData;
  readonly deploymentData: IOpsDeploymentData;
}

export interface IOpsDataContextFactory {
  create(config: IConfig): Promise<IOpsDataContext>;
}
