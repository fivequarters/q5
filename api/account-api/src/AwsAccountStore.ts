import { AccountStore, IAccount, IAccountList } from './AccountStore';
import { IAwsOptions } from '@5qtrs/aws-base';
import { AwsDynamo } from '@5qtrs/aws-dynamo';

// ------------------
// Internal Constants
// ------------------

const apiName = 'api-account';
const alreadyExistsCode = 'ConditionalCheckFailedException';

// ------------------
// Internal Functions
// ------------------

function accountToDynamo(account: IAccount) {
  return {
    displayName: { S: account.displayName },
    id: { S: account.id },
  };
}

function accountFromDynamo(item: any) {
  return {
    displayName: item.displayName.S,
    id: item.id.S,
  };
}

// -------------------
// Exported Interfaces
// -------------------

export class AwsAccountStore extends AccountStore {
  private dynamo: AwsDynamo;

  public static async create(options: IAwsOptions) {
    const dynamo = await AwsDynamo.create(options);
    return new AwsAccountStore(dynamo);
  }

  public constructor(dynamo: AwsDynamo) {
    super();
    this.dynamo = dynamo;
  }

  public async addAccount(displayName: string): Promise<IAccount> {
    const id = await this.generateId();
    const account = { id, displayName };

    const options = {
      expressionNames: { '#id': 'id' },
      condition: 'attribute_not_exists(#id)',
    };

    let tryLimit = 5;
    while (tryLimit > 0) {
      try {
        const item = accountToDynamo(account);
        await this.dynamo.putItem(apiName, item, options);
        return account;
      } catch (error) {
        if (error.code !== alreadyExistsCode) {
          throw error;
        }
        account.id = await this.generateId();
        tryLimit--;
      }
    }

    const message = 'Failed to create the acount after multiple attempts. Please try again.';
    throw new Error(message);
  }

  public async getAccount(id: string): Promise<IAccount> {
    const item = await this.dynamo.getItem(apiName, { id: { S: id } });
    return accountFromDynamo(item);
  }

  public async updateAccount(account: IAccount): Promise<IAccount> {
    const existing = await this.getAccount(account.id);

    existing.displayName = account.displayName;
    this.dynamo.putItem(apiName, existing);
    return existing;
  }

  public async deleteAccount(id: string): Promise<void> {
    return this.dynamo.deleteItem(apiName, { id: { S: id } });
  }

  public async listAccounts(next?: string, limit: number = 100): Promise<IAccountList> {
    const result = await this.dynamo.scanTable(apiName, { next, limit });
    const items = result.items.map(accountFromDynamo);
    return { items, next: result.next };
  }
}
