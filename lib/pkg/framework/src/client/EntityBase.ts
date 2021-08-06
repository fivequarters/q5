import { Context, Next, Router } from '../Router';
import * as Storage from '../Storage';
import { authorize } from '../middleware/index';

abstract class EntityBase {
  abstract service: EntityBase.ServiceBase;
  abstract storage: EntityBase.StorageBase;
  abstract middleware: EntityBase.MiddlewareBase;
  abstract response: EntityBase.ResponseBase;

  public readonly router: Router = new Router();
}

namespace EntityBase {
  export abstract class ServiceBase {}

  export abstract class StorageBase {
    setData: (ctx: Context, dataKey: string, data: any) => Promise<any> = async (
      ctx: Context,
      dataKey: string,
      data: any
    ) => Storage.createStorage(ctx.state.params).put(data, dataKey);
    getData: (ctx: Context, dataKey: string) => Promise<any> = async (ctx: Context, dataKey: string) =>
      Storage.createStorage(ctx.state.params).get(dataKey);
    listData: (ctx: Context, dataKeyPrefix: string, options?: Storage.IListOption) => Promise<any> = async (
      ctx: Context,
      dataKeyPrefix: string,
      options?: Storage.IListOption
    ) => Storage.createStorage(ctx.state.params).list(dataKeyPrefix, options);
    deleteData: (ctx: Context, dataKey: string) => Promise<any> = async (ctx: Context, dataKey: string) =>
      Storage.createStorage(ctx.state.params).delete(dataKey);
    deletePrefixedData: (ctx: Context, dataKeyPrefix?: string) => Promise<any> = (
      ctx: Context,
      dataKeyPrefix?: string
    ) => Storage.createStorage(ctx.state.params).delete(dataKeyPrefix, true, true);
  }
  export abstract class MiddlewareBase {
    authorizeUser = authorize;
    loadTenant: (tags: string) => (ctx: Context, next: Next) => Promise<any> = (tags: string) => {
      return async (ctx: Context, next: Next) => {
        return undefined; //Todo
      };
    };
    loadConnector?: (name: string) => (ctx: Context, next: Next) => Promise<any>;
  }
  export abstract class ResponseBase {
    createJsonForm: undefined; //TODO
    createError: undefined; //TODO
  }

  export class ServiceDefault extends ServiceBase {}
  export class StorageDefault extends StorageBase {}
  export class MiddlewareDefault extends MiddlewareBase {}
  export class ResponseDefault extends ResponseBase {}
}
export default EntityBase;
