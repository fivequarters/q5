import { IAgent, IIdentity, IAccessEntry } from '@5qtrs/account-data';

class SystemAgent implements IAgent {
  public id: string;
  public identities: IIdentity[];
  public access: {
    allow?: IAccessEntry[];
  };

  constructor(jwtPayload: any) {
    // create access.allow block based on contents of jwtPayload.
    this.id = '';
    this.identities = [];
    this.access = {};
  }
}

export { SystemAgent };
