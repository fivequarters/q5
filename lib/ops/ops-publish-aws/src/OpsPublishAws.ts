import { AwsDynamo, IAwsLambdaQueryOptions } from '@5qtrs/aws-dynamo';
import { AwsCreds } from '@5qtrs/aws-cred';
import { AwsS3 } from '@5qtrs/aws-s3';
import { AwsDeployment } from '@5qtrs/aws-deployment';
import { Zip } from '@5qtrs/zip';
import { AwsEcr } from '@5qtrs/aws-ecr';
import { random } from '@5qtrs/random';
import { createHash } from 'crypto';
import { OpsWorkspace, IWorkspaceDistFiles } from './OpsWorkspace';

// ------------------
// Internal Constants
// ------------------

const globalRegion = 'us-west-2';
const globalKey = 'global';
const awsPublishTableName = 'aws-publish';
const alreadyExistsCode = 'ConditionalCheckFailedException';

// ------------------
// Internal Functions
// ------------------

async function zipDistFiles(code: IWorkspaceDistFiles) {
  const zip = await Zip.create();
  for (const path in code) {
    if (path) {
      zip.addFile(path, code[path]);
    }
  }
  return zip.generate();
}

function getS3Key(code: IWorkspaceDistFiles) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();

  const hash = createHash('sha256');
  const files = Object.keys(code).sort();
  for (const file of files) {
    hash.update(file);
    hash.update(code[file]);
  }
  const digest = hash.digest('hex');
  return `${year}/${month}/${day}/${digest}`;
}

function awsPublishToDynamo(publish: IOpsAwsPublishDetails) {
  const item: any = {
    id: { S: publish.id },
    api: { S: publish.api },
    workspace: { S: publish.workspace },
    user: { S: publish.user },
    type: { S: publish.type.toString() },
    timestamp: { N: publish.timestamp.valueOf().toString() },
    s3Bucket: { S: publish.s3Bucket },
    s3Key: { S: publish.s3Key },
    bucketKey: { S: getBucketKey(publish.s3Bucket, publish.s3Key) },
  };

  if (publish.comment && publish.comment.length) {
    item.comment = { S: publish.comment };
  }

  return item;
}

function generateId() {
  return (random() as string).substring(0, 10);
}

function getBucketKey(s3Bucket: string, s3Key: string) {
  return `${s3Bucket}/${s3Key}`;
}

function awsPublishFromDynamo(item: any) {
  return {
    id: item.id.S,
    api: item.api.S,
    workspace: item.workspace.S,
    user: item.user.S,
    comment: item.comment ? item.comment.S : '',
    type: item.type.S as OpsAwsApiType,
    timestamp: new Date(parseInt(item.timestamp.N, 10)),
    s3Bucket: item.s3Bucket.S,
    s3Key: item.s3Key.S,
  };
}

// -------------------
// Exported Interfaces
// -------------------

export enum OpsAwsApiType {
  lambda = 'lambda',
  ec2 = 'ec2',
}

export interface IOpsAwsPublish {
  api: string;
  workspace: string;
  user: string;
  comment?: string;
}

export interface IOpsAwsPublishDetails extends IOpsAwsPublish {
  id: string;
  type: OpsAwsApiType;
  timestamp: Date;
  s3Bucket: string;
  s3Key: string;
}

export interface IOpsAwsPublishDetailsList {
  next?: any;
  items: IOpsAwsPublishDetails[];
}

// ----------------
// Exported Classes
// ----------------

export class OpsPublishAws {
  private workspace: OpsWorkspace;
  private userCreds: AwsCreds;
  private prodAccount: string;
  private prodRole: string;
  private dynamo?: AwsDynamo;
  private s3?: AwsS3;
  private ecr?: AwsEcr;

  private constructor(userCreds: AwsCreds, prodAccount: string, prodRole: string, workspace: OpsWorkspace) {
    this.userCreds = userCreds;
    this.prodAccount = prodAccount;
    this.prodRole = prodRole;
    this.workspace = workspace;
  }

  public static async create(userCreds: AwsCreds, prodAccount: string, prodRole: string) {
    const workspace = await OpsWorkspace.create();
    return new OpsPublishAws(userCreds, prodAccount, prodRole, workspace);
  }

  public async isSetup(): Promise<boolean> {
    const dynamo = await this.getDynamo();
    return dynamo.tableExists(awsPublishTableName);
  }

  public async setup() {
    const dynamo = await this.getDynamo();

    await dynamo.ensureTable({
      name: awsPublishTableName,
      attributes: { api: 'S', id: 'S', timestamp: 'N', bucketKey: 'S' },
      keys: ['api', 'id'],
      localIndexes: [
        {
          name: 'timestamp',
          keys: ['api', 'timestamp'],
        },
        {
          name: 'bucketKey',
          keys: ['api', 'bucketKey'],
        },
      ],
    });
  }

  public async buildApi(workspace: string) {
    return this.workspace.build(workspace);
  }

  public async bundleApi(workspace: string) {
    return this.workspace.bundle(workspace);
  }

  public async pushImage(repository: string, image: string) {
    const ecr = await this.getEcr();
    return ecr.pushImage(repository, image);
  }

  public async getPublishedApi(name: string, publishId: string) {
    const dynamo = await this.getDynamo();
    const key = { name: { S: name }, id: { S: publishId } };

    const item = await dynamo.getItem(awsPublishTableName, key);
    return item === undefined ? undefined : awsPublishFromDynamo(item);
  }

  public async listPublishedApi(name: string, user?: string, limit?: number, next?: any) {
    const dynamo = await this.getDynamo();

    const options: IAwsLambdaQueryOptions = {
      expressionNames: { '#api': 'api' },
      expressionValues: { ':api': { S: name } },
      keyCondition: '#api = :api',
      index: 'timestamp',
      scanForward: false,
    };
    if (user) {
      options.expressionNames = options.expressionNames || {};
      options.expressionNames['#user'] = 'user';

      options.expressionValues = options.expressionValues || {};
      options.expressionValues[':user'] = { S: user };
      options.filter = '#user = :user';
    }
    if (next) {
      options.next = next;
    }
    if (limit) {
      options.limit = limit;
    }

    const result = await dynamo.queryTable(awsPublishTableName, options);
    const items = result.items.map(awsPublishFromDynamo);
    return { items, next: result.next };
  }

  public async publishApi(publish: IOpsAwsPublish): Promise<IOpsAwsPublishDetails> {
    const distFiles = await this.workspace.getDistFiles(publish.workspace);
    const zip = await zipDistFiles(distFiles);
    const s3 = await this.getS3();
    const s3Key = getS3Key(distFiles);
    const fullName = `api-code-${publish.api}`;
    const s3Bucket = await s3.ensureBucket(fullName);
    const uploaded = await s3.uploadObject(fullName, s3Key, zip, { overwrite: false });

    if (!uploaded) {
      const published = await this.getPublishedApiFromS3(publish.api, s3Bucket, s3Key);
      if (published) {
        return published;
      }
    }

    const awsPublish = {
      id: generateId(),
      api: publish.api,
      user: publish.user,
      comment: publish.comment,
      s3Bucket,
      s3Key,
      timestamp: new Date(),
      workspace: publish.workspace,
      type: OpsAwsApiType.lambda,
    };

    const dynamo = await this.getDynamo();
    const options = {
      expressionNames: { '#api': 'api', '#id': 'id' },
      condition: 'attribute_not_exists(#api) and attribute_not_exists(#id)',
    };

    let tryLimit = 5;
    while (tryLimit > 0) {
      try {
        const item = awsPublishToDynamo(awsPublish);
        await dynamo.putItem(awsPublishTableName, item, options);
        return awsPublish;
      } catch (error) {
        if (error.code !== alreadyExistsCode) {
          throw error;
        }
        awsPublish.id = generateId();
        tryLimit--;
      }
    }

    const message = `Failed to create the publish record after multiple attempts.`;
    throw new Error(message);
  }

  private async getPublishedApiFromS3(name: string, s3Bucket: string, s3Key: string) {
    const dynamo = await this.getDynamo();
    const options: IAwsLambdaQueryOptions = {
      expressionNames: { '#bucketKey': 'bucketKey', '#api': 'api' },
      expressionValues: { ':bucketKey': { S: getBucketKey(s3Bucket, s3Key) }, ':api': { S: name } },
      keyCondition: '#api = :api and #bucketKey = :bucketKey',
      index: 'bucketKey',
      scanForward: false,
    };

    const result = await dynamo.queryTable(awsPublishTableName, options);
    const items = result.items.map(awsPublishFromDynamo);
    return items && items.length ? items[0] : undefined;
  }

  private async getDynamo() {
    if (!this.dynamo) {
      const deployment = await AwsDeployment.create({
        regionCode: globalRegion,
        key: globalKey,
        account: this.prodAccount,
      });
      const creds = this.userCreds.asRole({ account: this.prodAccount, name: this.prodRole });
      this.dynamo = await AwsDynamo.create({ creds, deployment });
    }
    return this.dynamo;
  }

  private async getEcr() {
    if (!this.ecr) {
      const deployment = await AwsDeployment.create({
        regionCode: globalRegion,
        key: globalKey,
        account: this.prodAccount,
      });
      const creds = this.userCreds.asRole({ account: this.prodAccount, name: this.prodRole });
      this.ecr = await AwsEcr.create({ creds, deployment });
    }
    return this.ecr;
  }

  private async getS3() {
    if (!this.s3) {
      const deployment = await AwsDeployment.create({
        regionCode: globalRegion,
        key: globalKey,
        account: this.prodAccount,
      });
      const creds = this.userCreds.asRole({ account: this.prodAccount, name: this.prodRole });
      this.s3 = await AwsS3.create({ creds, deployment });
    }
    return this.s3;
  }
}
