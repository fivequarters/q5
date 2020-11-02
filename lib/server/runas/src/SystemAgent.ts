import { IAccessEntry, IAgent, IIdentity } from '@5qtrs/account-data';

class SystemAgent implements IAgent {
  public id: string;
  public identities: IIdentity[];
  public access: {
    allow?: IAccessEntry[];
  };

  constructor(jwtPayload: any) {
    // XXX create access.allow block based on contents of jwtPayload.
    this.id = 'system';
    this.identities = [];
    this.access = JSON.parse(jwtPayload.perm);
    console.log(`SystemAgent ${JSON.stringify(this.access)}`);
  }
}

export { SystemAgent };
