import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { AccountDataAwsConfig } from '../AccountDataAwsConfig';
import { random } from '@5qtrs/random';
import { toBase64 } from '@5qtrs/base64';

// ------------------
// Internal Constants
// ------------------

const timestampIndex = 'timestamp';
const identityIndex = 'identity';
const delimiter = '::';

const table: IAwsDynamoTable = {
  name: 'audit2',
  attributes: { accountId: 'S', resource: 'S', identity: 'S', timestamp: 'N' },
  keys: ['accountId', 'resource'],
  ttlAttribute: 'ttl',
  toKey,
  toItem,
  fromItem,
  globalIndexes: [
    {
      name: timestampIndex,
      keys: ['accountId', 'timestamp'],
    },
    {
      name: identityIndex,
      keys: ['accountId', 'identity'],
    },
  ],
};

// ------------------
// Internal Functions
// ------------------

function toKey(accountId: string, resource: string) {
  return {
    accountId: { S: accountId },
    resource: { S: `${resource}${delimiter}${random()}` },
  };
}

function toItem(auditEntry: IAuditEntry, ttl: number) {
  const now = Date.now();
  const item: any = toKey(auditEntry.accountId, auditEntry.resource);
  item.timestamp = { N: now.toString() };
  item.ttl = { N: (ttl * 24 * 60 * 60 * 1000).toString() };
  item.identity = { S: toIdentity(auditEntry) };
  item.issuerId = { S: auditEntry.issuerId };
  item.subject = { S: auditEntry.subject };
  item.action = { S: auditEntry.action };
  item.authorized = { BOOL: auditEntry.authorized === true };

  if (auditEntry.data) {
    item.data = { S: JSON.stringify(auditEntry.data) };
  }

  return item;
}

function fromItem(item: any): IAuditEntry {
  const auditEntry = {
    accountId: item.accountId.S,
    resource: (item.resource.S as string).split(delimiter)[0],
    issuerId: item.issuerId.S,
    subject: item.subject.S,
    action: item.action.S,
    authorized: item.authorized.BOOL,
    timestamp: new Date(parseInt(item.timestamp.N, 10)).toISOString(),
  };

  return auditEntry;
}

function getConfig(config: AccountDataAwsConfig) {
  return () => ({
    defaultLimit: config.auditEntryDefaultLimit,
    maxLimit: config.auditEntryMaxLimit,
  });
}

function toIdentity({ issuerId, subject }: { issuerId: string; subject: string }) {
  return `${toBase64(issuerId)}${delimiter}${toBase64(subject)}`;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAuditEntry {
  accountId: string;
  issuerId: string;
  subject: string;
  action: string;
  resource: string;
  authorized: boolean;
  data?: object;
  timestamp?: string;
}

export interface IListAuditEntriesOptions {
  next?: string;
  limit?: number;
  from?: Date;
  to?: Date;
  resource?: string;
  action?: string;
  issuerId?: string;
  subject?: string;
}

export interface IListAuditEntriesResult {
  next?: string;
  items: IAuditEntry[];
}

// ----------------
// Exported Classes
// ----------------

export class AuditEntryTable extends AwsDynamoTable {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    return new AuditEntryTable(config, dynamo);
  }
  private config: AccountDataAwsConfig;

  private constructor(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
    this.config = config;
  }

  public async add(auditEntry: IAuditEntry): Promise<void> {
    const options = { context: this.config.auditEntryTtlDays };
    await this.putItem(auditEntry, options);
  }

  public async list(accountId: string, options?: IListAuditEntriesOptions): Promise<IListAuditEntriesResult> {
    let index = undefined;
    let timeStampFilter = true;
    let resourceFilter = true;
    let identityFilter = true;
    let disableConsistentRead = false;
    const filters: string[] = [];
    const keyConditions = ['accountId = :accountId'];
    const expressionNames: any = {};
    const expressionValues: any = { ':accountId': { S: accountId } };

    if (options) {
      if (options.from || options.to) {
        index = timestampIndex;
        timeStampFilter = false;
        disableConsistentRead = true;
      } else if (options.issuerId) {
        const { issuerId, subject } = options;
        index = identityIndex;
        identityFilter = false;
        disableConsistentRead = true;
        const identity = { S: toIdentity({ issuerId, subject: subject || '' }) };
        keyConditions.push('begins_with(#identity, :identity)');
        expressionNames['#identity'] = 'identity';
        expressionValues[':identity'] = identity;
      } else if (options.resource) {
        resourceFilter = false;
        keyConditions.push('begins_with(#resource, :resource)');
        expressionNames['#resource'] = 'resource';
        expressionValues[':resource'] = { S: options.resource };
      }

      const expression = timeStampFilter ? filters : keyConditions;
      if (options.from || options.to) {
        expressionNames['#timestamp'] = 'timestamp';
        let keyCondition;
        if (options.from) {
          expressionValues[':from'] = { N: options.from.getTime().toString() };
          keyCondition = '#timestamp >= :from';
        }
        if (options.to) {
          expressionValues[':to'] = { N: options.to.getTime().toString() };
          keyCondition = '#timestamp <= :to';
        }
        if (options.from && options.to) {
          keyCondition = '#timestamp BETWEEN :from AND :to';
        }

        if (keyCondition) {
          expression.push(keyCondition);
        }
      }

      if (options.action) {
        filters.push('begins_with(#action, :action)');
        expressionNames['#action'] = 'action';
        expressionValues[':action'] = { S: options.action };
      }

      if (options.resource && resourceFilter) {
        filters.push('begins_with(#resource, :resource)');
        expressionNames['#resource'] = 'resource';
        expressionValues[':resource'] = { S: options.resource };
      }

      if (options.issuerId && identityFilter) {
        const identity = { S: toIdentity({ issuerId: options.issuerId, subject: options.subject || '' }) };
        filters.push('begins_with(#identity, :identity)');
        expressionNames['#identity'] = 'identity';
        expressionValues[':identity'] = identity;
      }
    }

    const queryOptions = {
      next: options && options.next ? options.next : undefined,
      limit: options && options.limit ? options.limit : undefined,
      disableConsistentRead,
      index,
      keyConditions,
      filters,
      expressionNames,
      expressionValues,
    };

    return this.queryTable(queryOptions);
  }
}
