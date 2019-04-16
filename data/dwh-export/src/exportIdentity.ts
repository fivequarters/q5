import { IExportConfig, IExportContext, exportDynamoTable } from './utils';

export async function exportIdentity(ctx: IExportContext, config: IExportConfig) {
  return await exportDynamoTable(ctx, config, 'identity', 'identity', (x: any) => {
    let item: any = {
      json: {
        ts: config.ts,
        deploymentId: config.deploymentId,
        accountId: x.accountId && x.accountId.S,
        agentId: x.agentId && x.agentId.S,
        issuerId: x.iss && x.iss.S,
        sub: x.sub && x.sub.S,
      },
    };
    item.insertId = `${item.json.deploymentId}/${item.json.accountId}/${item.json.agentId}/${item.json.issuerId}/${
      item.json.sub
    }/${item.json.ts}`;
    return item;
  });
}
