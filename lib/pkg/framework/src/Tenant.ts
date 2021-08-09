import superagent from 'superagent';
import { Context } from './Router';

interface ITenantRequestParams {
  baseUrl: string;
  accountId: string;
  subscriptionId: string;
  instanceId: string;
  accessToken: string;
  integrationId: string;
}

interface IHttpResponse {
  status: number;
  body: any;
}

interface ITenantRequest {
  getTenant(tenantId: string): Promise<IInstance>;
  deleteTenant(tenantId: string): Promise<IHttpResponse>;
}

export interface IInstance {
  id: string;
  tags: { [key: string]: string };
  data: any;
  expires?: string;
  version?: string;
}

export const TENANT_TAG_NAME = 'tenant';

const _getRequestUrl = (ctx: Context, uri: string): string => {
  const { baseUrl, accountId, subscriptionId, integrationId } = ctx.state.params;
  const functionUrl = new URL(baseUrl);
  const requestUrl = `${functionUrl.protocol}//${functionUrl.host}/v2/account/${accountId}/subscription/${subscriptionId}/integration/${integrationId}/instance/${uri}`;
  return requestUrl;
};

const getTenant = async (ctx: Context, tenantId: string): Promise<IInstance> => {
  const { accessToken } = ctx.state.params;
  const response = await superagent
    .get(_getRequestUrl(ctx, `?tag=${TENANT_TAG_NAME}=${tenantId}`))
    .set('Authorization', `Bearer ${accessToken}`)
    .ok((res) => res.status < 300);
  return response.body?.data[0];
};

const deleteTenant = async (ctx: Context, tenantId: string) => {
  const { accessToken } = ctx.state.params;
  const tenantInstance = await getTenant(ctx, tenantId);
  const response = await superagent
    .delete(_getRequestUrl(ctx, tenantInstance.id))
    .set('Authorization', `Bearer ${accessToken}`)
    .ok((res) => res.status < 300);
  return response.body?.data;
};

export { getTenant, deleteTenant };
