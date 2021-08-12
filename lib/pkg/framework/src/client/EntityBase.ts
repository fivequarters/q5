import { Context, Next, Router } from '../Router';
import * as Storage from '../Storage';
import * as Middleware from '../middleware/authorize';
import { IOnStartup as IOnStartupInterface } from '../Manager';
type ContextType = Context;
type NextType = Next;
abstract class EntityBase {
  public readonly events = {};

  abstract service: EntityBase.ServiceBase;
  abstract storage: EntityBase.StorageBase;
  abstract middleware: EntityBase.MiddlewareBase;
  abstract response: EntityBase.ResponseBase;
  abstract tenant: EntityBase.TenantBase;

  public readonly router: Router = new Router();
}

namespace EntityBase {
  export namespace Types {
    export type Context = ContextType;
    export type Next = NextType;
    export interface IOnStartup extends IOnStartupInterface {}
    export interface IInstanceResponse {
      items: IInstance[];
      total: number;
    }
    export interface IInstance {
      id: string;
      tags: Record<string, string>;
      data: Record<string, IInstanceData>;
      expires?: string;
      version?: string;
    }
    export interface IInstanceData {
      tags: Record<string, string>;
      entityId: string;
      entityType: string;
      accountId: string;
      subscriptionId: string;
      parentEntityId: string;
      parentEntityType: string;
    }
  }
  export abstract class ServiceBase {}

  export abstract class StorageBase {
    constructor(service?: ServiceBase) {
      this.service = service;
    }
    service?: ServiceBase;
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
    constructor(service?: ServiceBase) {
      this.service = service;
    }
    service?: ServiceBase;
    authorizeUser = Middleware.authorize;
    loadTenant: (tags: string) => (ctx: Context, next: Next) => Promise<any> = (tags: string) => {
      return async (ctx: Context, next: Next) => {
        return undefined; //Todo
      };
    };
    loadConnector?: (name: string) => (ctx: Context, next: Next) => Promise<any>;
  }
  export abstract class ResponseBase {
    constructor(service?: ServiceBase) {
      this.service = service;
    }
    service?: ServiceBase;
    createJsonForm: undefined; //TODO
    createError: undefined; //TODO
  }
  export abstract class TenantBase {
    constructor(service?: ServiceBase) {
      this.service = service;
    }
    service?: ServiceBase;
  }

  export class ServiceDefault extends ServiceBase {}
  export class StorageDefault extends StorageBase {}
  export class MiddlewareDefault extends MiddlewareBase {}
  export class ResponseDefault extends ResponseBase {}
  export class TenantDefault extends TenantBase {}
}
export default EntityBase;
