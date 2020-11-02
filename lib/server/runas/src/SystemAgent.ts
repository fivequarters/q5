import { IAccessEntry, IAgent, IIdentity } from '@5qtrs/account-data';

class SystemAgent implements IAgent {
  public id: string;
  public identities: IIdentity[];
  public access: {
    allow?: IAccessEntry[];
  };

  constructor(jwtPayload: any) {
    console.log('SystemAgent new');
    // XXX create access.allow block based on contents of jwtPayload.
    this.id = '';
    this.identities = [];
    this.access = {};
  }
}

export { SystemAgent };
