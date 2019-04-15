import { IExportConfig, IExportContext, exportDynamoTable } from './utils';

export async function exportIssuer(ctx: IExportContext, config: IExportConfig) {
  return await exportDynamoTable(ctx, config, 'issuer', 'issuer', (x: any) => {
    let item: any = {
      json: {
        ts: config.ts,
        deploymentId: config.deploymentId,
        accountId: x.accountId && x.accountId.S,
        issuerId: x.identityId && x.identityId.S,
        displayName: x.displayName && x.displayName.S,
        jsonKeyUri: x.jsonKeyUri && x.jsonKeyUri.S,
      },
    };
    let key: any[] = [];
    [0, 1, 2].forEach(id => {
      if (x[`kid${id}`] && x[`publicKey${id}`]) {
        key.push({
          keyId: x[`kid${id}`].S,
          publicKey: x[`publicKey${id}`].S,
        });
      }
    });
    if (key.length > 0) {
      item.json.key = key;
    }
    item.insertId = `${item.json.deploymentId}/${item.json.accountId}/${item.json.issuerId}/${item.json.ts}`;
    return item;
  });
}
