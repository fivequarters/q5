import { IExportConfig, IExportContext, exportDynamoTable } from './utils';

export async function exportIssuer(ctx: IExportContext, config: IExportConfig) {
  return await exportDynamoTable(ctx, config, 'issuer', 'issuer', (x: any) => {
    let item: any = {
      json: {
        ts: config.ts,
        deploymentId: config.deploymentId,
        accountId: x.accountId && x.accountId.S,
        issuerId: x.issuerId && x.issuerId.S,
        displayName: x.displayName && x.displayName.S,
        jsonKeyUri: x.jsonKeyUri && x.jsonKeyUri.S,
      },
    };
    if (x.publicKeys && x.publicKeys.L) {
      item.json.key = x.publicKeys.L.map((key: any) => ({
        publicKey: key.M.publicKey.S,
        keyId: key.M.keyId.S,
      }));
    }
    item.insertId = `${item.json.deploymentId}/${item.json.accountId}/${item.json.issuerId}/${item.json.ts}`;
    return item;
  });
}
