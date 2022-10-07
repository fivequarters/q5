import RDS from '@5qtrs/db';

const SERVICE_NAME = 'aws';

export const get = async <AwsConfig>(config: { accountId: string; subscriptionId: string }): Promise<AwsConfig> => {
  const cfg = await RDS.DAO.storage.getEntity({
    accountId: config.accountId,
    subscriptionId: config.subscriptionId,
    id: `proxy/${SERVICE_NAME}/configuration`,
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
    id: `proxy/${SERVICE_NAME}/configuration`,
    data: config,
  });

  return cfg.data;
};
