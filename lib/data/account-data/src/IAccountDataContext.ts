import { IDataSource } from '@5qtrs/data';
import { IConfig } from '@5qtrs/config';
import { IAccountData } from './IAccountData';
import { IAgentData } from './IAgentData';
import { IClientData } from './IClientData';
import { IIssuerData } from './IIssuerData';
import { ISubscriptionData } from './ISubscriptionData';
import { IUserData } from './IUserData';
import { IAuditData } from './IAuditData';

// -------------------
// Exported Interfaces
// -------------------

export interface IAccountDataContext extends IDataSource {
  readonly accountData: IAccountData;
  readonly subscriptionData: ISubscriptionData;
  readonly issuerData: IIssuerData;
  readonly agentData: IAgentData;
  readonly userData: IUserData;
  readonly clientData: IClientData;
  readonly auditData: IAuditData;
}

export interface IAccountDataContextFactory {
  create(config: IConfig): Promise<IAccountDataContext>;
}
