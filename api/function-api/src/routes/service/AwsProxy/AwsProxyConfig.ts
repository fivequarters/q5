import RDS from '@5qtrs/db';

const SERVICE_PROXY_KEY = 'proxy/aws/configuration';

export const get = async <AwsConfig>(config: { accountId: string; subscriptionId: string }): Promise<AwsConfig> => {
  const cfg = await RDS.DAO.storage.getEntity({
    accountId: config.accountId,
    subscriptionId: config.subscriptionId,
    id: SERVICE_PROXY_KEY,
  });

  return { ...cfg.data, ...config };
};

export const set = async <AwsConfig>(
  params: { accountId: string; subscriptionId: string },
  config: AwsConfig
): Promise<AwsConfig> => {
  const cfg = await RDS.DAO.storage.createEntity({
    accountId: params.accountId,
    subscriptionId: params.subscriptionId,
    id: SERVICE_PROXY_KEY,
    data: config,
  });

  return cfg.data;
};
