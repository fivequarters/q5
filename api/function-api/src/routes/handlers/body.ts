import { Request } from 'express';
import { Model } from '@5qtrs/db';

interface IBaseEntityBody {
  id: string;
  tags?: { [key: string]: string };
  data?: { [key: string]: string };
  expires?: string;
}

interface IIdentityBody extends IBaseEntityBody {
  connectorId: string;
}

interface IInstanceBody extends IBaseEntityBody {
  integrationId: string;
}

type IEntityBody = IBaseEntityBody | IIdentityBody | IInstanceBody;

const entity = (req: Request, entityType?: Model.EntityType): IEntityBody => {
  const { id, tags, data, expires } = req.body;
  const entityBody: IEntityBody = { id, tags, data, expires };

  if (entityType === Model.EntityType.identity) {
    return { ...entityBody, connectorId: req.body.connectorId };
  }

  if (entityType === Model.EntityType.instance) {
    return { ...entityBody, integrationId: req.body.integration };
  }

  return entityBody;
};

const identity = (req: Request) => {
  return { ...entity(req), connectorId: req.body.connectorId };
};

const instance = (req: Request) => {
  return { ...entity(req), integrationId: req.body.integrationId };
};

export default { entity, identity, instance };
