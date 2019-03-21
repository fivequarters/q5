import { IndexNames, Dynamo, hexEncode } from './Common';

const DefaultTTL = +<string>process.env.FLEXD_AUDIT_TTL_DAYS || 365;

export interface IAuditEntry {
    accountId: string;
    issuer: string;
    subject: string;
    action: string;
    resource: string;
    data?: object;
    ttl?: number;
}

export function writeAudit(entry: IAuditEntry, cb: (error?: Error) => void) {
    let now = Date.now();
    let ttl = Math.floor((now + (entry.ttl || DefaultTTL) * 24 * 60 * 60 * 1000) / 1000); // EPOCH
    let putParams: AWS.DynamoDB.PutItemInput = {
        TableName: IndexNames.Resource,
        Item: {
            timestamp: { N: now.toString() },
            ttl: { N: ttl.toString() },
            accountId: { S: entry.accountId },
            // ensure uniqueness of (accountIt, resource) key by adding nonce to resource
            resource: { S: `${entry.resource}/#${now}.${Math.floor(Math.random()*999999)}` },
            identity: { S: `${hexEncode(entry.issuer)}/${hexEncode(entry.subject)}/`},
            issuer: { S: entry.issuer },
            subject: { S: entry.subject },
            action: { S: entry.action },
        }
    };
    if (entry.data) {
        putParams.Item.data = { S: JSON.stringify(entry.data) };
    }
    return Dynamo.putItem(putParams, cb);
};
