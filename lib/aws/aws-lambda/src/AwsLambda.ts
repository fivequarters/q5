import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { AwsLogs } from '@5qtrs/aws-log';
import { AwsRole, AwsRoleService, IAwsRolePolicy } from '@5qtrs/aws-role';
import { Lambda } from 'aws-sdk';

// ------------------
// Internal Constants
// ------------------

const supportedRuntimes = ['nodejs6.10', 'nodejs8.10'];
const defaultTimeout = 30;
const defaultMemorySize = 128;
const defaultHandler = 'index.handler';
const defaultRuntime = 'nodejs8.10';
const defaultDaysToRetain = 30;
const currentAlias = 'current';

// ------------------
// Internal Functions
// ------------------

function normalizeUploadOptions(options?: IAwsLambdaOptions) {
  const policies = options && options.policies !== undefined ? options.policies : [];
  const timeout = options && options.timeout !== undefined ? options.timeout : defaultTimeout;
  const memorySize = options && options.memorySize !== undefined ? options.memorySize : defaultMemorySize;
  const handler = options && options.handler !== undefined ? options.handler : defaultHandler;
  const runtime = options && options.runtime !== undefined ? options.runtime : defaultRuntime;
  const daysToRetain = options && options.daysToRetain !== undefined ? options.daysToRetain : defaultDaysToRetain;

  if (supportedRuntimes.indexOf(runtime) === -1) {
    const message = `The 'runtime' option value must be one of the following: ${supportedRuntimes.join()}`;
    throw new Error(message);
  }

  return {
    policies,
    timeout,
    memorySize,
    handler,
    runtime,
    daysToRetain,
  };
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsLambdaPolicy {
  actions: string[];
  resource: string;
}

export interface IAwsLambdaOptions {
  handler?: string;
  runtime?: string;
  memorySize?: number;
  timeout?: number;
  policies?: IAwsRolePolicy[];
  daysToRetain?: number;
}

export interface IAwsLambdaDetail {
  name: string;
  version: string;
  arn: string;
  hash: string;
  lastModified: Date;
  codeSize: number;
}

// ----------------
// Exported Classes
// ----------------

export class AwsLambda extends AwsBase<typeof Lambda> {
  public static async create(config: IAwsConfig) {
    return new AwsLambda(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  public async ensureFunction(
    name: string,
    s3Bucket: string,
    s3Key: string,
    options?: IAwsLambdaOptions
  ): Promise<IAwsLambdaDetail> {
    const exists = await this.functionExists(name);
    if (exists) {
      return this.deployFunction(name, s3Bucket, s3Key, options);
    }

    const normalized = normalizeUploadOptions(options);
    const logGroupName = await this.createLogGroup(name, normalized.daysToRetain);
    const roleName = `${name}-lambda`;
    const roleArn = await this.ensureRole(roleName, logGroupName, normalized.policies);
    const newFunction = await this.createFunction(name, s3Bucket, s3Key, roleArn, 0, options);
    await this.createAlias(name, newFunction.version);
    return newFunction;
  }

  public async deployFunction(
    name: string,
    s3Bucket: string,
    s3Key: string,
    options?: IAwsLambdaOptions
  ): Promise<IAwsLambdaDetail> {
    const hash = await this.updateFunctionCode(name, s3Bucket, s3Key);
    if (options) {
      await this.updateFunctionConfiguration(name, options);
    }

    const detail = await this.publishFunction(name, hash);
    await this.promoteFunction(name, detail.version);
    return detail;
  }

  public async promoteFunction(name: string, version: string): Promise<void> {
    try {
      return this.updateAlias(name, version);
    } catch (error) {
      if (error && error.code === 'ResourceNotFoundException') {
        return this.createAlias(name, version);
      }
      throw error;
    }
  }

  public async getFunction(name: string): Promise<IAwsLambdaDetail> {
    const lambda = await this.getAws();
    const fullName = this.getFullName(name);
    const params = { FunctionName: fullName };

    return new Promise((resolve, reject) => {
      lambda.getFunction(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const result = {
          name: data.FunctionName,
          version: data.Version,
          arn: data.FunctionArn,
          hash: data.CodeSha256,
          lastModified: new Date(data.LastModified),
          codeSize: data.CodeSize,
        };

        resolve(result);
      });
    });
  }

  public async functionExists(name: string): Promise<boolean> {
    try {
      await this.getFunction(name);
    } catch (error) {
      return false;
    }
    return true;
  }

  public async listFunctionVersions(name: string): Promise<IAwsLambdaDetail[]> {
    const lambda = await this.getAws();
    const fullName = this.getFullName(name);
    const params: any = {
      FunctionName: fullName,
    };

    return new Promise((resolve, reject) => {
      const result: IAwsLambdaDetail[] = [];

      const func = () => {
        lambda.listVersionsByFunction(params, (error: any, data: any) => {
          if (error) {
            return reject(error);
          }

          if (data) {
            if (data.Versions) {
              for (const version of data.Versions) {
                result.push({
                  name: version.FunctionName,
                  version: version.Version,
                  arn: version.FunctionArn,
                  hash: version.CodeSha256,
                  lastModified: new Date(version.LastModified),
                  codeSize: version.CodeSize,
                });
              }
            }
            if (data.NextMarker) {
              params.NextMarker = data.NextMarker;
              return func();
            }
          }
          resolve(result);
        });
      };

      func();
    });
  }

  public async deleteFunctionVersion(name: string, version: string): Promise<void> {
    const lambda = await this.getAws();
    const fullName = this.getFullName(name);
    const params = {
      FunctionName: fullName,
      FunctionVersion: version,
    };

    return new Promise((resolve, reject) => {
      lambda.deleteFunction(params, async (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  public async deleteFunction(name: string): Promise<void> {
    const lambda = await this.getAws();
    const fullName = this.getFullName(name);
    const params = { FunctionName: fullName };

    return new Promise((resolve, reject) => {
      lambda.deleteFunction(params, async (error: any) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }

  public async createAlias(name: string, version: string): Promise<void> {
    const lambda = await this.getAws();
    const fullName = this.getFullName(name);

    const params = {
      FunctionName: fullName,
      FunctionVersion: version,
      Name: currentAlias,
    };

    return new Promise((resolve, reject) => {
      lambda.createAlias(params, async (error: any) => {
        if (error) {
          reject(error);
        }
        resolve();
      });
    });
  }

  protected onGetAws(config: IAwsConfig) {
    return new Lambda(config);
  }

  private async updateFunctionCode(name: string, s3Bucket: string, s3Key: string): Promise<string> {
    const lambda = await this.getAws();
    const fullName = this.getFullName(name);

    const params = {
      FunctionName: fullName,
      S3Bucket: s3Bucket,
      S3Key: s3Key,
    };

    return new Promise((resolve, reject) => {
      lambda.updateFunctionCode(params, async (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        resolve(data.CodeSha256);
      });
    });
  }

  private async createFunction(
    name: string,
    s3Bucket: string,
    s3Key: string,
    roleArn: string,
    retryCount: number,
    options?: IAwsLambdaOptions
  ): Promise<IAwsLambdaDetail> {
    const lambda = await this.getAws();
    const fullName = this.getFullName(name);
    const normalized = normalizeUploadOptions(options);

    const params = {
      FunctionName: fullName,
      Timeout: normalized.timeout,
      MemorySize: normalized.memorySize,
      Publish: true,
      Handler: normalized.handler,
      Role: roleArn,
      Runtime: normalized.runtime,
      Code: {
        S3Bucket: s3Bucket,
        S3Key: s3Key,
      },
    };

    return new Promise((resolve, reject) => {
      lambda.createFunction(params, (error: any, data: any) => {
        if (
          error &&
          error.code === 'InvalidParameterValueException' &&
          error.message.indexOf('The role defined for the function cannot be assumed by Lambda') !== -1 &&
          retryCount < 5
        ) {
          // The role was created but is not yet visible in the system, so try again
          // with a delay
          return new Promise(() =>
            setTimeout(
              () => this.createFunction(name, s3Bucket, s3Key, roleArn, retryCount + 1, options),
              1000 * retryCount
            )
          );
        }

        if (error && error.code !== 'ResourceConflictException') {
          return reject(error);
        }

        const detail = {
          name: data.FunctionName,
          version: data.Version,
          arn: data.FunctionArn,
          hash: data.CodeSha256,
          lastModified: new Date(data.LastModified),
          codeSize: data.CodeSize,
        };
        resolve(detail);
      });
    });
  }

  private async updateFunctionConfiguration(name: string, options: IAwsLambdaOptions): Promise<IAwsLambdaDetail> {
    const lambda = await this.getAws();
    const fullName = this.getFullName(name);
    let logGroupName;
    if (options.daysToRetain !== undefined || options.policies !== undefined) {
      logGroupName = await this.createLogGroup(name, options.daysToRetain);
    }
    if (options.policies !== undefined && logGroupName) {
      await this.ensureRole(name, logGroupName, options.policies);
    }

    const params: any = {
      FunctionName: fullName,
    };
    if (options.handler) {
      params.Handler = options.handler;
    }
    if (options.memorySize) {
      params.MemorySize = options.memorySize;
    }
    if (options.runtime) {
      params.Runtime = options.runtime;
    }
    if (options.timeout) {
      params.Timeout = options.timeout;
    }

    return new Promise((resolve, reject) => {
      lambda.updateFunctionConfiguration(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const result = {
          name: data.FunctionName,
          version: data.Version,
          arn: data.FunctionArn,
          hash: data.CodeSha256,
          lastModified: new Date(data.LastModified),
          codeSize: data.CodeSize,
        };

        resolve(result);
      });
    });
  }

  private async publishFunction(name: string, hash: string): Promise<IAwsLambdaDetail> {
    const lambda = await this.getAws();
    const fullName = this.getFullName(name);
    const params = {
      FunctionName: fullName,
      CodeSha256: hash,
    };

    return new Promise((resolve, reject) => {
      lambda.publishVersion(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const result = {
          name: data.FunctionName,
          version: data.Version,
          arn: data.FunctionArn,
          hash: data.CodeSha256,
          lastModified: new Date(data.LastModified),
          codeSize: data.CodeSize,
        };

        resolve(result);
      });
    });
  }

  private async updateAlias(name: string, version: string): Promise<void> {
    const lambda = await this.getAws();
    const fullName = this.getFullName(name);

    const params = {
      FunctionName: fullName,
      FunctionVersion: version,
      Name: currentAlias,
    };

    return new Promise((resolve, reject) => {
      lambda.updateAlias(params, (error: any) => {
        if (error) {
          reject(error);
        }
        resolve();
      });
    });
  }

  private async ensureRole(functionName: string, logGroupName: string, policies?: IAwsRolePolicy[]): Promise<string> {
    const allPolicies = policies || [];
    const logPolicies = await this.getLogPolicies(logGroupName);
    allPolicies.push(...logPolicies);

    const role = await AwsRole.create(this.config);

    const principal = { service: AwsRoleService.lambda };
    const options = {
      path: functionName,
      policies: allPolicies,
    };

    const roleDetails = await role.ensureRole(functionName, principal, options);
    return roleDetails.arn;
  }

  private async getLogPolicies(logGroupName: string) {
    const logs = await AwsLogs.create(this.config);
    const streamPolicy = logs.getLogStreamPolicy(logGroupName, { create: true, write: true });
    return [streamPolicy];
  }

  private async createLogGroup(name: string, daysToRetain?: number): Promise<string> {
    const logs = await AwsLogs.create(this.config);
    return logs.createLogGroup(name, { daysToRetain, forLambda: true });
  }

  private async deleteLogGroup(name: string): Promise<void> {
    const logs = await AwsLogs.create(this.config);
    return logs.deleteLogGroup(name, { forLambda: true });
  }

  private async deleteRole(name: string): Promise<void> {
    const role = await AwsRole.create(this.config);
    role.deleteRole(name);
  }
}
