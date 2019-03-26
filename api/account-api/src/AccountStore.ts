import { random } from '@5qtrs/random';
import { clone } from '@5qtrs/clone';

// -------------------
// Exported Interfaces
// -------------------

export interface IAccount {
  id: string;
  displayName: string;
}

export interface IAccountList {
  items: IAccount[];
  next?: string;
}

export class AccountStore {
  private accounts: { [index: string]: IAccount | undefined };

  public constructor() {
    this.accounts = {};
  }

  public async addAccount(displayName: string): Promise<IAccount> {
    let id = await this.generateId();
    while (this.accounts[id] !== undefined) {
      id = await this.generateId();
    }

    const account = { id, displayName };
    this.accounts[id] = account;
    return clone(account);
  }

  public async getAccount(id: string): Promise<IAccount> {
    const existing = this.accounts[id] ? clone(this.accounts[id]) : undefined;
    if (existing === undefined) {
      throw new Error(`No account with id '${id}'`);
    }
    return existing;
  }

  public async updateAccount(account: IAccount): Promise<IAccount> {
    const existing = await this.getAccount(account.id);

    existing.displayName = account.displayName;
    return clone(existing);
  }

  public async deleteAccount(id: string): Promise<void> {
    this.accounts[id] = undefined;
  }

  public async listAccounts(next?: string, limit: number = 100): Promise<IAccountList> {
    const start = next !== undefined ? (parseInt(next) as number) : 0;
    if (start === NaN) {
      throw new Error(`The next token '${next}' is invalid`);
    }
    const items = Object.keys(this.accounts)
      .map(key => this.accounts[key] as IAccount)
      .slice(start, start + limit + 1);
    if (items.length > limit) {
      items.pop();
      return { items, next: (start + limit).toString() };
    }
    return { items };
  }

  protected async generateId() {
    return `acc-${random()}`;
  }
}
