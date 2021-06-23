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

const EntityById = (req: Request, paramIdName: string = 'componentId'): IEntityParams => {
  return { ...accountAndSubscription(req), id: req.params[paramIdName] };
};

const EntityTagKey = (req: Request, paramIdName: string = 'componentId'): IEntityTagParams => {
  return { ...EntityById(req, paramIdName), tagKey: req.params.tagKey };
};

const EntityTagKeyValue = (req: Request, paramIdName: string = 'componentId'): IEntityTagValueParams => {
  return { ...EntityTagKey(req, paramIdName), tagValue: req.params.tagValue };
};

export default { accountAndSubscription, EntityById, EntityTagKey, EntityTagKeyValue };
