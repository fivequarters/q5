import { Request } from 'express';

export interface IAccountParams {
  accountId: string;
  subscriptionId: string;
}

export interface ISessionIdParams extends IAccountParams {
  parentSessionId?: string;
}

export interface ISessionStepParams extends ISessionIdParams {
  stepName: string;
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
  const entityParams = EntityById(req);
  return { ...entityParams, componentId: entityParams.id, id: req.params.sessionId };
};

const SessionStep = (req: Request) => {
  return { ...SessionId(req), stepName: req.params.stepName };
};

export default { accountAndSubscription, EntityById, EntityTagKey, EntityTagKeyValue, SessionId, SessionStep };
