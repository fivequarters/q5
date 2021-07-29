import http_error from 'http-errors';

import RDS from '@5qtrs/db';

export const get = async <OAuthConfig>(
  name: string,
  params: { accountId: string; subscriptionId: string }
): Promise<OAuthConfig> => {
  if (!params?.accountId || !params?.subscriptionId) {
    throw http_error(500, `Proxy ${name} is not configured.`);
  }

  // Get the secrets and configuration from the proxy master account.
  const cfg = await RDS.DAO.storage.getEntity({
    accountId: params.accountId,
    subscriptionId: params.subscriptionId,
    id: `/proxy/${name}/configuration`,
  });

  return cfg.data;
};

export const set = async <OAuthConfig>(
  name: string,
  params: { accountId?: string; subscriptionId?: string },
  config: OAuthConfig
): Promise<OAuthConfig> => {
  if (!params?.accountId || !params?.subscriptionId) {
    throw http_error(500, `Proxy ${name} is not configured.`);
  }

  // Write the secrets and configuration to storage in the master account.
  const cfg = await RDS.DAO.storage.createEntity(
    {
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      id: `/proxy/${name}/configuration`,
      data: config,
    },
    { upsert: true }
  );

  return cfg.data;
};
