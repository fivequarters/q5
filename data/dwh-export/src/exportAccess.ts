import { IExportConfig, IExportContext, exportDynamoTable } from './utils';

export async function exportAccess(ctx: IExportContext, config: IExportConfig) {
  return await exportDynamoTable(ctx, config, 'access', 'access', (x: any) => {
    let entry = ((x.entry && x.entry.S) || 'NA::NA').split('::');
    let item: any = {
      json: {
        ts: config.ts,
        deploymentId: config.deploymentId,
        accountId: x.accountId && x.accountId.S,
        agentId: x.agentId && x.agentId.S,
        resource: entry[0] || 'NA',
        action: entry[1] || 'NA',
        allow: x.allow !== undefined ? x.allow.BOOL : false,
        fromRole: x.fromRole && x.fromRole.S,
      },
    };
    item.insertId = `${item.json.deploymentId}/${item.json.accountId}/${item.json.agentId}/${item.json.ts}/${
      item.json.resource
    }/${item.json.action}`;
    return item;
  });
}
