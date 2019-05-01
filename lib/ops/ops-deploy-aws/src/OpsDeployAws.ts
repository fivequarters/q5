import { AwsDynamo, IAwsDynamoQueryOptions } from '@5qtrs/aws-dynamo';
import { AwsCreds } from '@5qtrs/aws-cred';
import { AwsCert, IAwsCertDetail, IAwsCertValidateDetail } from '@5qtrs/aws-cert';
import { AwsRoute53 } from '@5qtrs/aws-route53';
import { AwsEc2 } from '@5qtrs/aws-ec2';
import { AwsNetwork } from '@5qtrs/aws-network';
import { AwsAlb } from '@5qtrs/aws-alb';
import { OpsCoreAws, IOpsAwsNetwork, IOpsAwsAccount } from '@5qtrs/ops-core-aws';

// ------------------
// Internal Constants
// ------------------

const globalRegion = 'us-west-2';
const globalKey = 'global';
const awsDeploymentTableName = 'aws-deployment';
const alreadyExistsCode = 'ConditionalCheckFailedException';
const deploymentTable = {
  name: awsDeploymentTableName,
  attributes: { name: 'S' },
  keys: ['name'],
};

// ------------------
// Internal Functions
// ------------------

function awsDeploymentToDynamo(deployment: IOpsAwsDeploymentDetails) {
  const item: any = {
    name: { S: deployment.name },
    network: { S: deployment.network },
    domain: { S: deployment.domain },
    hostedAt: { S: deployment.hostedAt },
    createdBy: { S: deployment.createdBy },
    updatedBy: { S: deployment.updatedBy },
    created: { N: deployment.created.valueOf().toString() },
    updated: { N: deployment.updated.valueOf().toString() },
  };

  if (deployment.comment && deployment.comment.length) {
    item.comment = { S: deployment.comment };
  }

  if (deployment.createdBy && deployment.createdBy.length) {
    item.createdBy = { S: deployment.createdBy };
  }

  if (deployment.updatedBy && deployment.updatedBy.length) {
    item.updatedBy = { S: deployment.updatedBy };
  }

  if (deployment.alternateDomains && deployment.alternateDomains.length) {
    item.alternateDomains = { S: deployment.alternateDomains.join(' ') };
  }

  return item;
}

function awsDeploymentFromDynamo(item: any) {
  const alternateDomains = item.alternateDomains ? item.alternateDomains.split(' ') : [];

  return {
    name: item.name.S,
    network: item.network.S,
    domain: item.domain.S,
    comment: item.comment ? item.comment.S : '',
    createdBy: item.createdBy ? item.createdBy.S : '',
    updatedBy: item.updatedBy ? item.updatedBy.S : '',
    created: new Date(parseInt(item.created.N, 10)),
    updated: new Date(parseInt(item.updated.N, 10)),
    hostedAt: item.hostedAt.S,
    alternateDomains,
  };
}

function getHostedAt(deployment: IOpsAwsDeployment) {
  return `${deployment.name}.${deployment.domain}`;
}

function getHostedAtWildcard(deployment: IOpsAwsDeployment) {
  return `*.${deployment.name}.${deployment.domain}`;
}

function getParentDomain(domain: string) {
  let normalized = domain.indexOf('*.') === 0 ? domain.replace('*.', '') : domain;
  const indexOfDot = normalized.indexOf('.');
  return normalized.substring(indexOfDot + 1);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsAwsDeployment {
  name: string;
  network: string;
  domain: string;
  createdBy?: string;
  updatedBy?: string;
  comment?: string;
  alternateDomains?: string[];
}

export interface IOpsAwsDeploymentDetails extends IOpsAwsDeployment {
  created: Date;
  updated: Date;
  hostedAt: string;
}

export interface IOpsAwsDeploymentDetailsList {
  next?: any;
  items: IOpsAwsDeploymentDetails[];
}

export interface IOpsAwsDeployApi {}

// ----------------
// Exported Classes
// ----------------

export class OpsDeployAws {
  private opsCore: OpsCoreAws;
  private userCreds: AwsCreds;
  private prodAccount: string;
  private prodRole: string;
  private dynamo?: AwsDynamo;

  private constructor(opsCore: OpsCoreAws, userCreds: AwsCreds, prodAccount: string, prodRole: string) {
    this.opsCore = opsCore;
    this.userCreds = userCreds;
    this.prodAccount = prodAccount;
    this.prodRole = prodRole;
  }

  public static async create(opsCore: OpsCoreAws, userCreds: AwsCreds, prodAccount: string, prodRole: string) {
    return new OpsDeployAws(opsCore, userCreds, prodAccount, prodRole);
  }

  public async isSetup(): Promise<boolean> {
    const dynamo = await this.getDynamo();
    return dynamo.tableExists(awsDeploymentTableName);
  }

  public async setup() {
    const dynamo = await this.getDynamo();

    await dynamo.ensureTable(deploymentTable);
  }

  public async awsDeploymentExists(deployment: IOpsAwsDeployment) {
    const existing = await this.getAwsDeployment(deployment.name);
    if (!existing) {
      return false;
    }

    if (deployment.network && deployment.domain) {
      const differentNetworks = existing.network !== deployment.network;
      const differentDomains = existing.domain !== deployment.domain;
      if (differentNetworks || differentDomains) {
        const message = [
          `A deployment with the name '${deployment.name}' already exists. However`,
          differentNetworks
            ? ` the existing id '${existing.network}' does not match the given id '${deployment.network}'`
            : '',
          differentNetworks && differentDomains ? ' and' : '',
          differentDomains
            ? ` the existing role '${existing.domain}' does not match the given role '${deployment.domain}'`
            : '',
        ].join('');
        throw new Error(message);
      }
    }

    return true;
  }

  public async getAwsDeployment(deploymentName: string): Promise<IOpsAwsDeployment | undefined> {
    const dynamo = await this.getDynamo();
    const key = { name: { S: deploymentName } };
    const item = await dynamo.getItem(deploymentTable, key);
    return item === undefined ? undefined : awsDeploymentFromDynamo(item);
  }

  public async listAwsDeployments(createdBy?: string, limit?: number, next?: any) {
    const dynamo = await this.getDynamo();

    const options: IAwsDynamoQueryOptions = {};
    if (createdBy) {
      options.expressionNames = options.expressionNames || {};
      options.expressionNames['#createdBy'] = 'createdBy';

      options.expressionValues = options.expressionValues || {};
      options.expressionValues[':createdBy'] = { S: createdBy };
      options.filters = ['#createdBy = :createdBy'];
    }
    if (next) {
      options.next = next;
    }
    if (limit) {
      options.limit = limit;
    }

    const result = await dynamo.scanTable(deploymentTable, options);
    const items = result.items.map(awsDeploymentFromDynamo);
    return { items, next: result.next };
  }

  public async addAwsDeployment(deployment: IOpsAwsDeployment) {
    const dynamo = await this.getDynamo();
    const options = {
      expressionNames: { '#name': 'name' },
      condition: 'attribute_not_exists(#name)',
    };

    const now = new Date();
    const fullDeployment = {
      name: deployment.name,
      network: deployment.network,
      domain: deployment.domain,
      createdBy: deployment.createdBy,
      updatedBy: deployment.updatedBy || deployment.createdBy,
      comment: deployment.comment,
      created: now,
      updated: now,
      hostedAt: getHostedAt(deployment),
      alternateDomains: deployment.alternateDomains || [],
    };

    const item = awsDeploymentToDynamo(fullDeployment);

    try {
      await dynamo.putItem(deploymentTable, item, options);
    } catch (error) {
      if (error.code !== alreadyExistsCode) {
        throw error;
      }
      const message = `The deployment '${deployment.name}' already exists.`;
      throw new Error(message);
    }

    return fullDeployment;
  }

  public async deployInstance(deploymentName: string, image: string) {
    const deployment = await this.getAwsDeploymentOrThrow(deploymentName);
    const awsNetwork = await this.getAwsNetworkOrThrow(deployment.network);
    const awsAccount = await this.getAwsAccountOrThrow(awsNetwork.account);

    const network = await this.getNetwork(awsNetwork, awsAccount);
    const ec2 = await this.getEc2(deploymentName, awsNetwork, awsAccount);

    const networkDetails = await network.ensureNetwork(awsNetwork.name);

    const [repository, tag] = image.split(':');
    const launch = {
      deploymentName: deploymentName,
      subnetId: networkDetails.privateSubnets[0].id,
      securityGroupId: networkDetails.securityGroupId,
      instanceType: 't2.medium',
      logPort: '5002',
      apiPort: '3001',
      albApiPort: '3001',
      albLogPort: '5002',
      role: 'arn:aws:iam::321612923577:instance-profile/Flexd-EC2-Instance',
      image: {
        repository,
        tag,
        account: '321612923577',
        region: 'us-west-2',
      },
    };

    await ec2.launchInstance(launch);
  }

  public async awsCertExists(deploymentName: string) {
    const cert = await this.getCertForDeployment(deploymentName);
    if (cert) {
      const deployment = await this.getAwsDeployment(deploymentName);
      if (deployment) {
        const hostedAt = getHostedAt(deployment);
        const alternateDomains = deployment.alternateDomains || [];
        alternateDomains.push(getHostedAtWildcard(deployment));
        return cert.certExists(hostedAt, { alternateDomains });
      }
    }
    return false;
  }

  public async issueAwsCert(deploymentName: string) {
    const deployment = await this.getAwsDeploymentOrThrow(deploymentName);
    const network = await this.getAwsNetworkOrThrow(deployment.network);
    const account = await this.getAwsAccountOrThrow(network.account);
    const cert = await this.getCert(deploymentName, network, account);
    const certDetails = await this.getCertDetails(deployment, network, account);
    if (certDetails.status === 'ISSUED') {
      return;
    }

    if (certDetails.status !== 'PENDING_VALIDATION') {
      const message = `Certificate is not pending validation, but has '${certDetails.status}' status.`;
      throw new Error(message);
    }

    for (const validation of certDetails.validations) {
      if (validation.status === 'FAILED') {
        const message = `Certificate record '${validation.domain}' validation has 'FAILED' status.`;
        throw new Error(message);
      }
    }

    await this.createRecords(certDetails);
    await cert.waitForCert(certDetails.arn);
    await this.deleteRecords(certDetails);
  }

  public async addAwsAlb(deploymentName: string) {
    const deployment = await this.getAwsDeploymentOrThrow(deploymentName);
    const network = await this.getAwsNetworkOrThrow(deployment.network);
    const account = await this.getAwsAccountOrThrow(network.account);
    const certDetails = await this.getCertDetails(deployment, network, account);
    const alb = await this.getAlb(deploymentName, network, account);

    const options = {
      albName: deploymentName,
      certArns: [certDetails.arn],
    };
    await alb.ensureAlb(deployment.network, options);
  }

  private async getCertDetails(deployment: IOpsAwsDeployment, network: IOpsAwsNetwork, account: IOpsAwsAccount) {
    const cert = await this.getCert(deployment.name, network, account);
    const hostedAt = getHostedAt(deployment);
    const alternateDomains = deployment.alternateDomains || [];
    alternateDomains.push(getHostedAtWildcard(deployment));
    return cert.issueCert(hostedAt, { alternateDomains });
  }

  private async createRecordForValidation(validation: IAwsCertValidateDetail) {
    if (validation.status === 'PENDING_VALIDATION') {
      const validationDomain = validation.domain;
      const parentDomain = getParentDomain(validationDomain);
      const domain = await this.getAwsDomainOrThrow(parentDomain);
      const account = await this.getAwsAccountOrThrow(domain.account);
      const route53 = await this.getRoute53(account);

      return route53.ensureRecord(parentDomain, {
        name: validation.record.name,
        type: 'CNAME',
        values: validation.record.value,
      });
    }
  }

  private async deleteRecordForValidation(validation: IAwsCertValidateDetail) {
    const validationDomain = validation.domain;
    const parentDomain = getParentDomain(validationDomain);
    const domain = await this.getAwsDomainOrThrow(parentDomain);
    const account = await this.getAwsAccountOrThrow(domain.account);
    const route53 = await this.getRoute53(account);
    return route53.deleteRecord(name, {
      name: validation.record.name,
      type: 'CNAME',
      values: validation.record.value,
    });
  }

  private async createRecords(certDetails: IAwsCertDetail): Promise<void> {
    const promises = [];
    const validatingRecords: any = {};
    for (const validation of certDetails.validations) {
      if (!validatingRecords[validation.record.name]) {
        validatingRecords[validation.record.name] = true;
        promises.push(this.createRecordForValidation(validation));
      }
    }
    await Promise.all(promises);
  }

  private async deleteRecords(certDetails: IAwsCertDetail): Promise<void> {
    const promises = [];
    const validatingRecords: any = {};
    for (const validation of certDetails.validations) {
      if (!validatingRecords[validation.record.name]) {
        validatingRecords[validation.record.name] = true;
        promises.push(this.deleteRecordForValidation(validation));
      }
    }
    await Promise.all(promises);
  }

  private async getOptionsOrThrow(deploymentName: string) {
    const awsDeployment = await this.getAwsDeploymentOrThrow(deploymentName);
    const network = await this.getAwsNetworkOrThrow(awsDeployment.network);
    const account = await this.getAwsAccountOrThrow(network.account);

    const creds = this.userCreds.asRole(account.id, account.role);
    return { creds, account: account.id, region: network.region, prefix: deploymentName };
  }

  private async getAwsNetworkOrThrow(networkName: string) {
    const network = await this.opsCore.getAwsNetwork(networkName);
    if (!network) {
      const message = `The network '${networkName}' does not exist.`;
      throw new Error(message);
    }
    return network;
  }

  private async getAwsAccountOrThrow(accountName: string) {
    const account = await this.opsCore.getAwsAccount(accountName);
    if (!account) {
      const message = `The AWS account '${accountName}' does not exist.`;
      throw new Error(message);
    }
    return account;
  }

  private async getAwsDomainOrThrow(domainName: string) {
    const domain = await this.opsCore.getAwsDomain(domainName);
    if (!domain) {
      const message = `The domain '${domainName}' does not exist.`;
      throw new Error(message);
    }
    return domain;
  }

  private async getAwsDeploymentOrThrow(deploymentName: string) {
    const deployment = await this.getAwsDeployment(deploymentName);
    if (!deployment) {
      const message = `The deployment '${deploymentName}' does not exist.`;
      throw new Error(message);
    }
    return deployment;
  }

  private async getDeploymentAccountOrThrow(deploymentName: string) {
    const account = await this.getDeploymentAccount(deploymentName);
    if (!account) {
      const message = `The deployment '${deploymentName}' does not have an AWS account.`;
      throw new Error(message);
    }
    return account;
  }

  private async getDeploymentAccount(deploymentName: string) {
    const deployment = await this.getAwsDeployment(deploymentName);
    if (deployment) {
      const network = await this.opsCore.getAwsNetwork(deployment.network);
      if (network) {
        const account = await this.opsCore.getAwsAccount(network.account);
        return account;
      }
    }
    return undefined;
  }

  public async getOptions(deploymentName: string) {
    const awsDeployment = await this.getAwsDeployment(deploymentName);
    if (awsDeployment) {
      const network = await this.opsCore.getAwsNetwork(awsDeployment.network);
      if (network) {
        const account = await this.opsCore.getAwsAccount(network.account);
        if (account) {
          const creds = this.userCreds.asRole(account.id, account.role);
          return { creds, account: account.id, region: network.region, prefix: deploymentName };
        }
      }
    }
    return undefined;
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

  private async getCertForDeployment(deploymentName: string) {
    const deployment = await this.getAwsDeployment(deploymentName);
    if (deployment) {
      const network = await this.opsCore.getAwsNetwork(deployment.network);
      if (network) {
        const account = await this.opsCore.getAwsAccount(network.account);
        if (account) {
          return await this.getCert(deploymentName, network, account);
        }
      }
    }
    return undefined;
  }

  private async getAlbForDeployment(deploymentName: string) {
    const deployment = await this.getAwsDeployment(deploymentName);
    if (deployment) {
      const network = await this.opsCore.getAwsNetwork(deployment.network);
      if (network) {
        const account = await this.opsCore.getAwsAccount(network.account);
        if (account) {
          return await this.getAlb(deploymentName, network, account);
        }
      }
    }
    return undefined;
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

  private async getCert(deploymentName: string, awsNetwork: IOpsAwsNetwork, awsAccount: IOpsAwsAccount) {
    const creds = this.userCreds.asRole(awsAccount.id, awsAccount.role);
    return await AwsCert.create({ creds, region: awsNetwork.region, prefix: deploymentName, account: awsAccount.id });
  }

  private async getEc2(deploymentName: string, awsNetwork: IOpsAwsNetwork, awsAccount: IOpsAwsAccount) {
    const creds = this.userCreds.asRole(awsAccount.id, awsAccount.role);
    return await AwsEc2.create({ creds, region: awsNetwork.region, prefix: deploymentName, account: awsAccount.id });
  }

  private async getRoute53(awsAccount: IOpsAwsAccount) {
    const creds = this.userCreds.asRole(awsAccount.id, awsAccount.role);
    return await AwsRoute53.create({ creds, region: 'us-east-1', prefix: awsAccount.name, account: awsAccount.id });
  }

  private async getAlb(deploymentName: string, awsNetwork: IOpsAwsNetwork, awsAccount: IOpsAwsAccount) {
    const creds = this.userCreds.asRole(awsAccount.id, awsAccount.role);
    return await AwsAlb.create({ creds, region: awsNetwork.region, prefix: deploymentName, account: awsAccount.id });
  }
}
