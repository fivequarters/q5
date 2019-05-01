import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AwsNetwork } from '@5qtrs/aws-network';
import { AwsRoute53 } from '@5qtrs/aws-route53';
import { AwsCreds } from '@5qtrs/aws-cred';

// ------------------
// Internal Constants
// ------------------

const globalRegion = 'us-west-2';
const globalKey = 'global';
const awsAccountTableName = 'aws-account';
const awsAccountIdTableName = 'aws-account-id';
const awsNetworkTableName = 'aws-network';
const awsDomainTableName = 'aws-domain';
const delimiter = '::';

const alreadyExistsCode = 'ConditionalCheckFailedException';

// ------------------
// Internal Functions
// ------------------

const accountId = {
  name: awsAccountIdTableName,
  attributes: { id: 'S' },
  keys: ['id'],
};

const account = {
  name: awsAccountTableName,
  attributes: { name: 'S' },
  keys: ['name'],
};

const network = {
  name: awsNetworkTableName,
  attributes: { name: 'S' },
  keys: ['name'],
};

const domain = {
  name: awsDomainTableName,
  attributes: { name: 'S' },
  keys: ['name'],
};

function awsAccountToDynamo(deployment: IOpsAwsAccount) {
  return {
    name: { S: deployment.name },
    id: { S: deployment.id },
    role: { S: deployment.role },
  };
}

function awsAccountFromDynamo(item: any) {
  return {
    name: item.name.S,
    id: item.id.S,
    role: item.role.S,
  };
}

function awsNetworkToDynamo(deployment: IOpsAwsNetwork) {
  return {
    name: { S: deployment.name },
    account: { S: deployment.account },
    region: { S: deployment.region },
  };
}

function awsNetworkFromDynamo(item: any) {
  return {
    name: item.name.S,
    account: item.account.S,
    region: item.region.S,
  };
}

function awsDomainToDynamo(deployment: IOpsAwsDomain) {
  return {
    name: { S: deployment.name },
    account: { S: deployment.account },
  };
}

function awsDomainFromDynamo(item: any) {
  return {
    name: item.name.S,
    account: item.account.S,
  };
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsAwsAccount {
  name: string;
  id: string;
  role: string;
}

export interface IOpsAwsNetwork {
  name: string;
  account: string;
  region: string;
}

export interface IOpsAwsDomain {
  name: string;
  account: string;
  nameServers?: string[];
}

// ----------------
// Exported Classes
// ----------------

export class OpsCoreAws {
  private userCreds: AwsCreds;
  private prodAccount: string;
  private prodRole: string;
  private dynamo?: AwsDynamo;

  private constructor(userCreds: AwsCreds, prodAccount: string, prodRole: string) {
    this.userCreds = userCreds;
    this.prodAccount = prodAccount;
    this.prodRole = prodRole;
  }

  public static async create(userCreds: AwsCreds, prodAccount: string, prodRole: string) {
    return new OpsCoreAws(userCreds, prodAccount, prodRole);
  }

  public async isSetup(): Promise<boolean> {
    const dynamo = await this.getDynamo();
    return dynamo.tableExists(awsAccountTableName);
  }

  public async setup() {
    const dynamo = await this.getDynamo();

    await dynamo.ensureTable(accountId);
    await dynamo.ensureTable(account);
    await dynamo.ensureTable(network);
    await dynamo.ensureTable(domain);
  }

  public async ensureAwsAccount(awsAccount: IOpsAwsAccount) {
    const existing = await this.awsAccountExists(awsAccount);
    if (!existing) {
      return this.addAwsAccount(awsAccount);
    }
  }

  public async awsAccountExists(awsAccount: IOpsAwsAccount) {
    const existing = await this.getAwsAccount(awsAccount.name);
    if (!existing) {
      return false;
    }

    const differentIds = existing.id !== awsAccount.id;
    const differentRoles = existing.role !== awsAccount.role;
    if (differentIds || differentRoles) {
      const message = [
        `An AWS account with the name '${awsAccount.name}' already exists. However`,
        differentIds ? ` the existing id '${existing.id}' does not match the given id '${awsAccount.id}'` : '',
        differentIds && differentRoles ? ' and' : '',
        differentRoles
          ? ` the existing role '${existing.role}' does not match the given role '${awsAccount.role}'`
          : '',
      ].join('');
      throw new Error(message);
    }

    return true;
  }

  public async getAwsAccount(accountName: string): Promise<IOpsAwsAccount | undefined> {
    const dynamo = await this.getDynamo();
    const key = { name: { S: accountName } };

    const item = await dynamo.getItem(account, key);
    return item === undefined ? undefined : awsAccountFromDynamo(item);
  }

  public async listAwsAccounts(): Promise<IOpsAwsAccount[]> {
    const dynamo = await this.getDynamo();

    let result;
    const items = [];
    do {
      const options: any = {};
      if (result && result.next) {
        options.next = result.next;
      }
      result = await dynamo.scanTable(account, options);
      items.push(...result.items.map(awsAccountFromDynamo));
    } while (result && result.next !== undefined);

    return items;
  }

  public async addAwsAccount(awsAccount: IOpsAwsAccount): Promise<void> {
    if (awsAccount.name.indexOf(delimiter) !== -1) {
      const message = `The AWS account name '${awsAccount.name}' is invalid; it contains the '${delimiter}' delimiter.`;
      throw new Error(message);
    }
    const idIsUnique = await this.addAwsAccountId(awsAccount.id);
    if (!idIsUnique) {
      const message = `The AWS account id '${awsAccount.id}' is already used with an existing account.`;
      throw new Error(message);
    }

    const dynamo = await this.getDynamo();
    const options = {
      expressionNames: { '#name': 'name' },
      condition: 'attribute_not_exists(#name)',
    };
    const item = awsAccountToDynamo(awsAccount);
    try {
      await dynamo.putItem(account, item, options);
    } catch (error) {
      if (error.code !== alreadyExistsCode) {
        throw error;
      }
      const message = `The account name '${awsAccount.name}' already exists.`;
      throw new Error(message);
    }
  }

  public async ensureAwsNetwork(awsNetwork: IOpsAwsNetwork) {
    const exists = await this.awsNetworkExists(awsNetwork);
    if (!exists) {
      return this.addAwsNetwork(awsNetwork);
    }
  }

  public async awsNetworkExists(awsNetwork: IOpsAwsNetwork) {
    const existing = await this.getAwsNetwork(awsNetwork.name);
    if (!existing) {
      return false;
    }

    const differentRegions = existing.region !== awsNetwork.region;
    const differentAccounts = existing.account !== awsNetwork.account;
    if (differentRegions || differentAccounts) {
      const message = [
        `An AWS network with the name '${awsNetwork.name}' already exists. However`,
        differentRegions
          ? ` the existing region '${existing.region}' does not match the given region '${awsNetwork.region}'`
          : '',
        differentRegions && differentAccounts ? ' and' : '',
        differentAccounts
          ? ` the existing account'${existing.account}' does not match the given account '${awsNetwork.account}'`
          : '',
      ].join('');
      throw new Error(message);
    }

    const awsAccount = await this.getAwsAccountOrThrow(awsNetwork.account);
    const network = await this.getNetwork(awsNetwork, awsAccount);
    await network.ensureNetwork(awsNetwork.name);
    return true;
  }

  public async getAwsNetwork(networkName: string): Promise<IOpsAwsNetwork | undefined> {
    const dynamo = await this.getDynamo();
    const key = { name: { S: networkName } };

    const item = await dynamo.getItem(network, key);
    if (item === undefined) {
      return undefined;
    }

    const awsNetwork = awsNetworkFromDynamo(item);
    const awsAccount = await this.getAwsAccountOrThrow(awsNetwork.account);
    const networks = await this.getNetwork(awsNetwork, awsAccount);
    await networks.ensureNetwork(awsNetwork.name);
    return awsNetwork;
  }

  public async addAwsNetwork(awsNetwork: IOpsAwsNetwork): Promise<void> {
    if (awsNetwork.name.indexOf(delimiter) !== -1) {
      const message = `The AWS network name '${awsNetwork.name}' is invalid; it contains the '${delimiter}' delimiter.`;
      throw new Error(message);
    }

    const awsAccount = await this.getAwsAccountOrThrow(awsNetwork.account);

    const dynamo = await this.getDynamo();
    const options = {
      expressionNames: { '#name': 'name' },
      condition: 'attribute_not_exists(#name)',
    };
    const item = awsNetworkToDynamo(awsNetwork);
    try {
      await dynamo.putItem(network, item, options);
    } catch (error) {
      if (error.code !== alreadyExistsCode) {
        throw error;
      }
      const message = `The network name '${awsNetwork.name}' already exists.`;
      throw new Error(message);
    }

    const networks = await this.getNetwork(awsNetwork, awsAccount);
    await networks.ensureNetwork(awsNetwork.name);
  }

  public async listAwsNetworks(): Promise<IOpsAwsNetwork[]> {
    const dynamo = await this.getDynamo();

    let result;
    const items = [];
    do {
      const options: any = {};
      if (result && result.next) {
        options.next = result.next;
      }
      result = await dynamo.scanTable(network, options);
      items.push(...result.items.map(awsNetworkFromDynamo));
    } while (result && result.next !== undefined);

    return items;
  }

  public async awsDomainExists(awsDomain: IOpsAwsDomain) {
    const existing = await this.getAwsDomain(awsDomain.name);
    if (!existing) {
      return false;
    }

    const differentAccounts = existing.account !== awsDomain.account;
    if (differentAccounts) {
      const message = [
        `An AWS network with the name '${awsDomain.name}' already exists. However`,
        `the existing account'${existing.account}' does not match the given account '${awsDomain.account}'`,
      ].join(' ');
      throw new Error(message);
    }

    const awsAccount = await this.getAwsAccountOrThrow(awsDomain.account);
    const route53 = await this.getRoute53(awsAccount);
    await route53.ensureHostedZone(awsDomain.name);
    return true;
  }

  public async getAwsDomain(domainName: string): Promise<IOpsAwsDomain | undefined> {
    const dynamo = await this.getDynamo();
    const key = { name: { S: domainName } };

    const item = await dynamo.getItem(domain, key);
    if (item === undefined) {
      return undefined;
    }

    const awsDomain: IOpsAwsDomain = awsDomainFromDynamo(item);
    const awsAccount = await this.getAwsAccountOrThrow(awsDomain.account);
    const route53 = await this.getRoute53(awsAccount);
    await route53.ensureHostedZone(awsDomain.name);
    return this.attachAwsDomainNameServers(awsDomain);
  }

  public async addAwsDomain(awsDomain: IOpsAwsDomain): Promise<void> {
    if (awsDomain.name.indexOf(delimiter) !== -1) {
      const message = `The AWS network name '${awsDomain.name}' is invalid; it contains the '${delimiter}' delimiter.`;
      throw new Error(message);
    }

    const awsAccount = await this.getAwsAccountOrThrow(awsDomain.account);

    const dynamo = await this.getDynamo();
    const options = {
      expressionNames: { '#name': 'name' },
      condition: 'attribute_not_exists(#name)',
    };
    const item = awsDomainToDynamo(awsDomain);
    try {
      await dynamo.putItem(domain, item, options);
    } catch (error) {
      if (error.code !== alreadyExistsCode) {
        throw error;
      }
      const message = `The network name '${awsDomain.name}' already exists.`;
      throw new Error(message);
    }

    const route53 = await this.getRoute53(awsAccount);
    await route53.ensureHostedZone(awsDomain.name);
  }

  public async listAwsDomains(): Promise<IOpsAwsDomain[]> {
    const dynamo = await this.getDynamo();

    let result;
    const items = [];
    do {
      const options: any = {};
      if (result && result.next) {
        options.next = result.next;
      }
      result = await dynamo.scanTable(domain, options);
      items.push(...result.items.map(awsDomainFromDynamo));
    } while (result && result.next !== undefined);

    return items;
  }

  private async getAwsAccountOrThrow(accountName: string) {
    const account = await this.getAwsAccount(accountName);
    if (!account) {
      const message = `The AWS account '${accountName}' does not exist.`;
      throw new Error(message);
    }
    return account;
  }

  private async attachAwsDomainNameServers(awsDomain: IOpsAwsDomain): Promise<IOpsAwsDomain> {
    const awsAccount = await this.getAwsAccountOrThrow(awsDomain.account);
    const route53 = await this.getRoute53(awsAccount);
    const records = await route53.getRecords(awsDomain.name, 'NS');

    awsDomain.nameServers = [];
    if (records !== undefined) {
      for (const record of records) {
        awsDomain.nameServers.push(...record.values);
      }
    }

    return awsDomain;
  }

  private async addAwsAccountId(id: string): Promise<boolean> {
    const dynamo = await this.getDynamo();
    const options = {
      expressionNames: { '#id': 'id' },
      condition: 'attribute_not_exists(#id)',
    };
    const item = { id: { S: id } };
    let putOk = true;
    try {
      await dynamo.putItem(accountId, item, options);
    } catch (error) {
      if (error && error.code !== alreadyExistsCode) {
        throw error;
      }
      putOk = false;
    }
    return putOk;
  }

  private async getDynamo() {
    if (!this.dynamo) {
      const creds = this.userCreds.asRole(this.prodAccount, this.prodRole);
      this.dynamo = await AwsDynamo.create({
        creds,
        account: this.prodAccount,
        region: globalRegion,
        prefix: globalKey,
      });
    }
    return this.dynamo;
  }

  private async getNetwork(awsNetwork: IOpsAwsNetwork, awsAccount: IOpsAwsAccount) {
    const creds = this.userCreds.asRole(awsAccount.id, awsAccount.role);
    return await AwsNetwork.create({
      creds,
      account: awsAccount.id,
      region: awsNetwork.region,
      prefix: awsNetwork.name,
    });
  }

  private async getRoute53(awsAccount: IOpsAwsAccount) {
    const creds = this.userCreds.asRole(awsAccount.id, awsAccount.role);
    return await AwsRoute53.create({ creds, account: awsAccount.id, region: 'us-east-1', prefix: awsAccount.name });
  }
}
