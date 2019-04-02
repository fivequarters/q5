import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { random } from '@5qtrs/random';

// ------------------
// Internal Constants
// ------------------

const tableName = 'init';
const inviteIdLength = 16;
const delimiter = '::';
const ttlInterval = 1000 * 60 * 60 * 8; // 8 hours

// ------------------
// Internal Functions
// ------------------

function generateInitId() {
  return `int-${random({ lengthInBytes: inviteIdLength / 2 })}`;
}

function toDynamoKey(accountId: string, agentId: string, initId: string) {
  const initMap = [accountId, agentId, initId].join(delimiter);
  return {
    initMap: { S: initMap },
  };
}

function toDynamoItem(accountId: string, agentId: string, initId: string, ttl: number) {
  const item: any = toDynamoKey(accountId, agentId, initId);
  item.ttl = { N: ttl.toString() };
  return item;
}

function fromDynamoItem(item: any, full: boolean = false): IInitEntry {
  const initMap = item.initMap.S;
  const [accountId, agentId, initId] = initMap.split(delimiter);
  return {
    accountId,
    agentId,
    initId,
  };
}

// -------------------
// Exported Interfaces
// -------------------

export interface IInitEntry {
  accountId: string;
  agentId: string;
  initId: string;
}

// ----------------
// Exported Classes
// ----------------

export class InitStore {
  private dynamo: AwsDynamo;

  private constructor(dynamo: AwsDynamo) {
    this.dynamo = dynamo;
  }

  public static async create(dynamo: AwsDynamo) {
    return new InitStore(dynamo);
  }

  public async isSetup() {
    return this.dynamo.tableExists(tableName);
  }

  public async setup() {
    return this.dynamo.ensureTable({
      name: tableName,
      attributes: { initMap: 'S' },
      keys: ['initMap'],
      ttlAttribute: 'ttl',
    });
  }

  public async addInitId(accountId: string, agentId: string): Promise<IInitEntry | undefined> {
    const options = {
      expressionNames: { '#initMap': 'initMap' },
      condition: 'attribute_not_exists(#initMap)',
      onCollision: (item: any) => {
        const ttl = Date.now() + ttlInterval;
        const initId = generateInitId();
        return toDynamoItem(accountId, agentId, initId, ttl);
      },
    };

    const ttl = Date.now() + ttlInterval;
    const initId = generateInitId();
    const item = toDynamoItem(accountId, agentId, initId, ttl);
    const finalItem = await this.dynamo.addItem(tableName, item, options);
    return fromDynamoItem(finalItem);
  }

  public async resolveInitId(accountId: string, agentId: string, initId: string): Promise<boolean> {
    const key = toDynamoKey(accountId, agentId, initId);
    const item = await this.dynamo.getItem(tableName, key);
    if (!item || !item.ttl || item.ttl.N < Date.now()) {
      return false;
    }

    await this.dynamo.deleteItem(tableName, key);
    return true;
  }
}
