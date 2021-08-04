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
  get(tenantId: string): Promise<IInstance | undefined>;
  delete(tenantId: string): Promise<IHttpResponse>;
}

export const createRequest = (params: ITenantRequestParams): ITenantRequest => {
  const functionUrl = new URL(params.baseUrl);
  const baseUrl = `${functionUrl.protocol}//${functionUrl.host}/v2/account/${params.accountId}/subscription/${params.subscriptionId}`;
  const instanceUrl = `/integration/${params.integrationId}/instance?tag=tenant=`;
  return {
    async get(tenantId: string): Promise<IInstance | undefined> {
      const response = await superagent
        .get(`${baseUrl}${instanceUrl}${tenantId}`)
        .set('Authorization', `Bearer ${params.accessToken}`)
        .ok((res) => res.status < 300 || res.status === 404);
      return response.status === 404 ? undefined : response.body?.data[0];
    },
    async delete(tenantId: string) {
      const response = await superagent
        .delete(`${baseUrl}${instanceUrl}${tenantId}`)
        .set('Authorization', `Bearer ${params.accessToken}`)
        .ok((res) => res.status < 300 || res.status === 404);
      return response.status === 404 ? undefined : response.body.data;
    },
  };
};
