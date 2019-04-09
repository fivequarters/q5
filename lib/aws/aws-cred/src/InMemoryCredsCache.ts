import { IAwsCredsCache } from './AwsCreds';

// ----------------
// Exported Classes
// ----------------

export class InMemoryCredsCache implements IAwsCredsCache {
  private creds: { [index: string]: string } = {};

  public async set(key: string, value: string) {
    this.creds[key] = value;
  }

  public async get(key: string) {
    return this.creds[key] || '';
  }
}
