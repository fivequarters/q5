import superagent from 'superagent';

export interface ITenantRequestParams {
  baseUrl: string;
  accountId: string;
  subscriptionId: string;
  instanceId: string;
  accessToken: string;
  integrationId: string;
}

export interface ITenant {
  [key: string]: string;
}

export interface IInstance {
  id: string;
  tags: ITenant;
  data?: any;
  expires?: string;
  version?: string;
}

export interface IHttpResponse {
  status: number;
  body: any;
}

export interface ITenantRequest {
  getTenant(tenantId: string): Promise<IInstance>;
  deleteTenant(tenantId: string): Promise<IHttpResponse>;
}

export const createRequest = (params: ITenantRequestParams): ITenantRequest => {
  const _getRequestUrl = (uri: string): string => {
    const functionUrl = new URL(params.baseUrl);
    const baseUrl = `${functionUrl.protocol}//${functionUrl.host}/v2/account/${params.accountId}/subscription/${params.subscriptionId}/integration/${params.integrationId}/instance/${uri}`;
    return baseUrl;
  };
  const getTenant = async (tenantId: string): Promise<IInstance> => {
    const response = await superagent
      .get(_getRequestUrl(`?tag=tenant=${tenantId}`))
      .set('Authorization', `Bearer ${params.accessToken}`)
      .ok((res) => res.status < 300 || res.status === 404);
    return response.status === 404 ? undefined : response.body?.data[0];
  };
  const deleteTenant = async (tenantId: string) => {
    const tenantInstance = await getTenant(tenantId);
    if (tenantInstance?.id) {
      const response = await superagent
        .delete(_getRequestUrl(tenantInstance.id))
        .set('Authorization', `Bearer ${params.accessToken}`)
        .ok((res) => res.status < 300 || res.status === 404);
      return response.status === 404 ? undefined : response.body.data;
    }
  };
  return {
    getTenant,
    deleteTenant,
  };
};
