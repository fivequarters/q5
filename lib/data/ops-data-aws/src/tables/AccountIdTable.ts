import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { OpsDataException } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '../OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'aws-account-id',
  attributes: { accountId: 'S' },
  keys: ['accountId'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(id: string) {
  return {
    accountId: { S: id },
  };
}

function toItem(idAndName: IOpsAccountId) {
  const item: any = toKey(idAndName.id);
  item.accountName = { S: idAndName.name };
  return item;
}

function fromItem(item: any): IOpsAccountId {
  return {
    id: item.accountId.S,
    name: item.accountName.S,
  };
}

function onAccountAlreadyExists(idAndName: IOpsAccountId) {
  throw OpsDataException.accountIdAlreadyExists(idAndName.id);
}

function onAccountDoesNotExist(accountId: string) {
  throw OpsDataException.noAccountId(accountId);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsAccountId {
  id: string;
  name: string;
}

// ----------------
// Exported Classes
// ----------------

export class AccountIdTable extends AwsDynamoTable {
  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    return new AccountIdTable(config, dynamo);
  }

  private constructor(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    super(table, dynamo);
  }

  public async add(idAndName: IOpsAccountId): Promise<void> {
    const options = { onConditionCheckFailed: onAccountAlreadyExists };
    return this.addItem(idAndName, options);
  }

  public async get(accountId: string): Promise<IOpsAccountId> {
    const options = { onNotFound: onAccountDoesNotExist };
    return this.getItem(accountId, options);
  }
}
