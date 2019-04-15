import { IExportConfig, IExportContext, exportDynamoTable } from './utils';

export async function exportAccount(ctx: IExportContext, config: IExportConfig) {
  return await exportDynamoTable(ctx, config, 'account', 'account', (x: any) => {
    return {
      json: {
        ts: config.ts,
        deploymentId: config.deploymentId,
        accountId: x.id && x.id.S,
        displayName: x.displayName && x.displayName.S,
        primaryEmail: x.primaryEmail && x.primaryEmail.S,
        archived: x.archived !== undefined ? x.archived.BOOL : false,
      },
      insertId: `${config.deploymentId}/${x.id && x.id.S}/${config.ts}`,
    };
  });
}
