import { IExportConfig, IExportContext, exportDynamoTable } from './utils';

export async function exportSubscription(ctx: IExportContext, config: IExportConfig) {
  return await exportDynamoTable(ctx, config, 'subscription', 'subscription', (x: any) => {
    let item: any = {
      json: {
        ts: config.ts,
        deploymentId: config.deploymentId,
        accountId: x.accountId && x.accountId.S,
        subscriptionId: x.subscriptionId && x.subscriptionId.S,
        displayName: x.displayName && x.displayName.S,
        archived: x.archived !== undefined ? x.archived.BOOL : false,
      },
    };
    item.insertId = `${item.json.deploymentId}/${item.json.accountId}/${item.json.subscriptionId}/${item.json.ts}`;
    return item;
  });
}
