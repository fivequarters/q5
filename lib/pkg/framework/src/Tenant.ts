import superagent from 'superagent';

export interface ITenantRequestParam {
  baseUrl: string;
  accountId: string;
  subscriptionId: string;
  accessToken: string;
}

export interface ITenantRequest {
  get(tags?: string | string[]): Promise<string[] | undefined>;
  getInstanceTenants(instanceId: string): Promise<string[] | undefined>;
  getTenantInstances(tenantId: string): Promise<string[] | undefined>;
  delete(tenantId: string): Promise<string | undefined>;
}

export const createRequest = (params: ITenantRequestParam): ITenantRequest => {
  // TODO: Figure out multiple tags.
  const _getBaseUrl = (tags?: string | string[]): string => {
    const functionUrl = new URL(params.baseUrl);
    const baseUrl = `${functionUrl.protocol}//${functionUrl.host}/v1/account/${params.accountId}/subscription/${params.subscriptionId}/tag/${tags}`;
    return baseUrl;
  };
  return {
    async get(tags?: string | string[]) {
      const response = await superagent
        .get(_getBaseUrl(tags))
        .set('Authorization', `Bearer ${params.accessToken}`)
        .ok((res) => res.status < 300 || res.status === 404);
      return response.status === 404 ? undefined : response.body.data;
    },
    async getInstanceTenants(instanceId: string) {
      const response = await superagent
        .get(_getBaseUrl(instanceId))
        .set('Authorization', `Bearer ${params.accessToken}`)
        .ok((res) => res.status < 300 || res.status === 404);
      return response.status === 404 ? undefined : response.body.data;
    },
    async getTenantInstances(tenantId: string) {
      const response = await superagent
        .get(_getBaseUrl(tenantId))
        .set('Authorization', `Bearer ${params.accessToken}`)
        .ok((res) => res.status < 300 || res.status === 404);
      return response.status === 404 ? undefined : response.body.data;
    },
    async delete(tenantId: string) {
      const response = await superagent
        .delete(_getBaseUrl(tenantId))
        .set('Authorization', `Bearer ${params.accessToken}`)
        .ok((res) => res.status < 300 || res.status === 404);
      return response.status === 404 ? undefined : response.body.data;
    },
  };
};
