import { IAccessEntry, IAgent, IIdentity } from '@5qtrs/account-data';
import * as Constants from '@5qtrs/constants';

class SystemAgent implements IAgent {
  public id: string;
  public identities: IIdentity[];
  public access: {
    allow?: IAccessEntry[];
  };

  constructor(jwtPayload: any) {
    this.id = 'system';
    this.identities = [];
    this.access = jwtPayload[Constants.JWT_PERMISSION_CLAIM];
  }
}

export { SystemAgent };
