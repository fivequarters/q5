import { Request } from 'express';

interface IAccountParams {
  accountId: string;
  subscriptionId: string;
}

interface IEntityParams extends IAccountParams {
  id: string;
}

interface IEntityTagParams extends IEntityParams {
  tagKey: string;
}

interface IEntityTagValueParams extends IEntityTagParams {
  tagValue: string;
}

const accountAndSubscription = (req: Request): IAccountParams => {
  return { accountId: req.params.accountId, subscriptionId: req.params.subscriptionId };
};

const EntityById = (req: Request): IEntityParams => {
  return { ...accountAndSubscription(req), id: req.params.componentId };
};

const EntityTagKey = (req: Request): IEntityTagParams => {
  return { ...EntityById(req), tagKey: req.params.tagKey };
};

const EntityTagKeyValue = (req: Request): IEntityTagValueParams => {
  return { ...EntityTagKey(req), tagValue: req.params.tagValue };
};

const SessionId = (req: Request) => {
  return { ...accountAndSubscription(req), id: req.params.sessionId };
};

export default { accountAndSubscription, EntityById, EntityTagKey, EntityTagKeyValue, SessionId };
