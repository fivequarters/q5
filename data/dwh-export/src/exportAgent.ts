import { IExportConfig, IExportContext, exportDynamoTable } from './utils';

export async function exportAgent(ctx: IExportContext, config: IExportConfig) {
  await ctx.bq.query(`DELETE FROM \`dwh.agent\` WHERE ts = '${config.ts}'`);
  await exportDynamoTable(
    ctx,
    config,
    'client',
    'agent',
    (x: any) => {
      let item: any = {
        json: {
          ts: config.ts,
          deploymentId: config.deploymentId,
          accountId: x.accountId && x.accountId.S,
          agentId: x.clientId && x.clientId.S,
          agentType: 'client',
          displayName: x.displayName && x.displayName.S,
          archived: x.archived !== undefined ? x.archived.BOOL : false,
        },
      };
      item.insertId = `${item.json.deploymentId}/${item.json.accountId}/${item.json.agentId}/${item.json.ts}`;
      return item;
    },
    true
  );
  return await exportDynamoTable(
    ctx,
    config,
    'user',
    'agent',
    (x: any) => {
      let item: any = {
        json: {
          ts: config.ts,
          deploymentId: config.deploymentId,
          accountId: x.accountId && x.accountId.S,
          agentId: x.userId && x.userId.S,
          agentType: 'user',
          firstName: x.firstName && x.firstName.S,
          lastName: x.lastName && x.lastName.S,
          primaryEmail: x.primaryEmail && x.primaryEmail.S,
          archived: x.archived !== undefined ? x.archived.BOOL : false,
        },
      };
      item.insertId = `${item.json.deploymentId}/${item.json.accountId}/${item.json.agentId}/${item.json.ts}`;
      return item;
    },
    true
  );
}
