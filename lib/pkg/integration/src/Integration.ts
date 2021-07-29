import { Router, Storage, IStorageClient, Context, IListOption } from '@fusebit-int/framework';
import superagent from 'superagent';
import { accountId, subscriptionId } from '@5qtrs/function-api/libc/routes/validation/common';

enum HTTPMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DELETE = 'delete',
}
const accessToken = '';
const baseUrl = '';

class Integration {
  constructor() {
    this.router = new Router();
    this.storageClient = Storage.createStorage({
      baseUrl,
      accessToken,
      accountId,
      subscriptionId,
    });
    this.accessToken = accessToken;
    this.baseUrl = baseUrl;
    this.functionUrl = new URL(baseUrl);
  }

  public readonly router: Router;

  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly functionUrl: URL;
  private readonly storageClient: IStorageClient;


  readonly storage = {
    setData: async (dataKey: string, data: any) => this.storageClient.put(data, dataKey),
    getData: async (dataKey: string) => this.storageClient.get(dataKey),
    listData: async (dataKeyPrefix: string, options?: IListOption) => this.storageClient.list(dataKeyPrefix, options),
    deleteData: (dataKey?: string) => this.storageClient.delete(dataKey),
    deleteDataWithPrefix: (dataKeyPrefix?: string) => this.storageClient.delete(dataKeyPrefix, true, true),
    listTenants: async (tenantPrefix?: string) => this.storageClient.get(`tenant/${tenantPrefix}*`),
    listInstanceTenants: async (instanceId: string) => undefined, //TODO
    listTenantInstances: async (tenantId: string) => undefined, //TODO
    deleteTenant: async (tenant: string) => undefined, //TODO
  };

  readonly middleware = {
    authorizeUser: (Permissions: string | string[]) => (ctx: Context, next: () => {}) => undefined, //TODO
    loadConnector: undefined, //TODO
    loadTenant: undefined, //TODO
  };

  readonly service = {
    getSDK: async (ctx: Context, connectorName: string) =>
      ctx.state.manager.connectors.getByName(connectorName, (ctx: Context) => ctx.params.tenantId)(ctx),
    getSDKs: (ctx: Context, connectorNames: string[]) =>
      ctx.state.manager.connectors.getByNames(connectorNames, (ctx: Context) => ctx.params.tenantIc)(ctx),
  };

  readonly response = {
    createJsonForm: undefined, //TODO
    createError: undefined, //TODO
  };
}
export default Integration;



private v2Request = async (method: HTTPMethod = HTTPMethod.GET, uri: string, body?: any) => {
  const request = superagent[method](`${this.baseUrl}/v2/account/${accountId}/subscriptions/${subscriptionId}/${uri}`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${this.accessToken}`)
    .set('Accept', 'application/json')
    .ok((res) => res.status < 300 || res.status === 404);

  if (![HTTPMethod.GET, HTTPMethod.DELETE].includes(method)) {
    return request.send(body);
  } else {
    return request;
  }
};