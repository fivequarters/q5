import RDS, { Model } from '@5qtrs/db';
import BaseComponentService from './BaseComponentService';
import { IEntity } from '@5qtrs/db/libc/model';

class IdentityService extends BaseComponentService<Model.IIdentity, Model.IIdentity> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.identity);
    this.entityType = Model.EntityType.identity;
  }

  public loadDependentEntities = async (connectorArg: IEntity, identityArg: IEntity): Promise<IEntity> => {
    const connector = await RDS.DAO.connector.getEntity(connectorArg);
    return {
      ...identityArg,
      id: `/connector/${connector.__databaseId}/${identityArg.id}`,
    };
  };
}

export default IdentityService;
