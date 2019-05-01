import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { IAwsRolePolicy } from '@5qtrs/aws-role';
import { CloudWatchLogs } from 'aws-sdk';

// ------------------
// Internal Constants
// ------------------

const validRetentionDays = [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653];

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsLogsOptions {
  forLambda?: boolean;
}

export interface IAwsLogsCreateGroupOptions extends IAwsLogsOptions {
  daysToRetain?: number;
}

export interface IAwsLogsGroupPolicyOptions {
  create?: boolean;
  read?: boolean;
  delete?: boolean;
}

export interface IAwsLogsStreamPolicyOptions {
  create?: boolean;
  write?: boolean;
  read?: boolean;
  delete?: boolean;
}

export interface IAwsLogsGroupDetail {
  name: string;
  daysToRetain: string;
  arn: string;
}

export interface IAwsLogsStreamDetail {
  name: string;
  firstEvent: Date;
  lastEvent: Date;
  arn: string;
}

// ----------------
// Exported Classes
// ----------------

export class AwsLogs extends AwsBase<typeof CloudWatchLogs> {
  public static async create(config: IAwsConfig) {
    return new AwsLogs(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  public getLogGroupPolicy(options?: IAwsLogsGroupPolicyOptions): IAwsRolePolicy {
    const actions = [];
    const create = options && options.create !== undefined ? options.create : false;
    const read = options && options.read !== undefined ? options.read : false;
    const del = options && options.delete !== undefined ? options.delete : false;
    if (create) {
      actions.push('logs:CreateLogGroup');
    }
    if (read) {
      actions.push('logs:DescribeLogGroups');
    }
    if (!del) {
      actions.push('logs:DeleteLogGroup');
    }
    return {
      actions,
      resource: `arn:aws:logs:${this.awsRegion}:${this.awsAccount}:*`,
    };
  }

  public getLogStreamPolicy(groupName: string, options?: IAwsLogsStreamPolicyOptions): IAwsRolePolicy {
    const actions = [];
    const create = options && options.create !== undefined ? options.create : false;
    const read = options && options.read !== undefined ? options.read : false;
    const write = options && options.write !== undefined ? options.write : false;
    const del = options && options.delete !== undefined ? options.delete : false;
    if (create) {
      actions.push('logs:CreateLogStream');
    }
    if (read) {
      actions.push('logs:GetLogEvents');
      actions.push('logs:FilterLogEvents');
      actions.push('logs:DescribeLogStreams');
    }
    if (write) {
      actions.push('logs:PutLogEvents');
    }
    if (del) {
      actions.push('logs:DeleteLogStream');
    }
    return {
      actions,
      resource: `arn:aws:logs:${this.awsRegion}:${this.awsAccount}:log-group:${groupName}:*`,
    };
  }

  public async createLogGroup(name: string, options?: IAwsLogsCreateGroupOptions): Promise<string> {
    const daysToRetain = options && options.daysToRetain !== undefined ? options.daysToRetain : 0;
    if (daysToRetain > 0 && validRetentionDays.indexOf(daysToRetain) === -1) {
      const message = `The 'daysToRetain' option value must be one of the following: ${validRetentionDays.join()}`;
      throw new Error(message);
    }

    const forLambda = options && options.forLambda !== undefined ? options.forLambda : true;
    const logGroupName = forLambda ? this.getLambdaPrefixedName(name) : this.getFullName(name);

    const logs = await this.getAws();
    const params: any = { logGroupName };

    return new Promise((resolve, reject) => {
      logs.createLogGroup(params, (error: any) => {
        if (error && error.code !== 'ResourceAlreadyExistsException') {
          reject(error);
        }

        if (daysToRetain > 0) {
          params.retentionInDays = daysToRetain;
          return logs.putRetentionPolicy(params, (error2: any) => {
            if (error && error.code !== 'ResourceAlreadyExistsException') {
              reject(error);
            }

            resolve(logGroupName);
          });
        }

        resolve(logGroupName);
      });
    });
  }

  public async listLogGroups(prefix?: string, options?: IAwsLogsOptions): Promise<IAwsLogsGroupDetail[]> {
    const forLambda = options && options.forLambda !== undefined ? options.forLambda : true;
    const logGroupName = forLambda ? this.getLambdaPrefixedName(prefix || '') : this.getFullName(prefix || '');
    const logs = await this.getAws();
    const params: any = {
      logGroupNamePrefix: logGroupName,
    };

    return new Promise((resolve, reject) => {
      const results: IAwsLogsGroupDetail[] = [];
      const func = () => {
        logs.describeLogGroups(params, (error: any, data: any) => {
          if (error) {
            reject(error);
          }

          if (data.logGroups) {
            for (const group of data.logGroups) {
              results.push({
                name: group.logGroupName,
                daysToRetain: group.retentionInDays,
                arn: group.arn,
              });
            }
          }
          if (data.nextToken) {
            params.nextToken = data.nextToken;
            return func();
          }

          resolve(results);
        });
      };

      func();
    });
  }

  public async deleteLogGroup(name: string, options?: IAwsLogsOptions): Promise<void> {
    const forLambda = options && options.forLambda !== undefined ? options.forLambda : true;
    const logGroupName = forLambda ? this.getLambdaPrefixedName(name) : this.getFullName(name);

    const logs = await this.getAws();
    const params: any = { logGroupName };

    return new Promise((resolve, reject) => {
      logs.deleteLogGroup(params, (error: any) => {
        if (error) {
          reject(error);
        }
        resolve();
      });
    });
  }

  public async createLogStrem(groupName: string, streamName: string): Promise<void> {
    const logs = await this.getAws();
    const params: any = {
      logGroupName: this.getFullName(groupName),
      logStreamName: streamName,
    };

    return new Promise((resolve, reject) => {
      logs.createLogStream(params, (error: any) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });
  }

  public async listLogStreams(groupName: string, prefix?: string): Promise<IAwsLogsStreamDetail[]> {
    const logs = await this.getAws();
    const params: any = {
      logGroupName: this.getFullName(groupName),
    };
    if (prefix) {
      params.logStreamNamePrefix = prefix;
    }

    return new Promise((resolve, reject) => {
      const results: IAwsLogsStreamDetail[] = [];
      const func = () => {
        logs.describeLogStreams(params, (error: any, data: any) => {
          if (error) {
            reject(error);
          }

          if (data.logStreams) {
            for (const stream of data.logStreams) {
              results.push({
                name: stream.logStreamName,
                firstEvent: new Date(stream.firstEventTimestamp),
                lastEvent: new Date(stream.lastEventTimestamp),
                arn: stream.arn,
              });
            }
          }
          if (data.nextToken) {
            params.nextToken = data.nextToken;
            return func();
          }

          resolve(results);
        });
      };

      func();
    });
  }

  public async deleteLogStream(groupName: string, streamName: string): Promise<void> {
    const logs = await this.getAws();
    const params: any = {
      logGroupName: this.getFullName(groupName),
      logStreamName: streamName,
    };

    return new Promise((resolve, reject) => {
      logs.deleteLogStream(params, (error: any) => {
        if (error) {
          reject(error);
        }
        resolve();
      });
    });
  }

  protected onGetAws(config: IAwsConfig) {
    return new CloudWatchLogs(config);
  }

  private getLambdaPrefixedName(name: string) {
    return `/aws/lambda/${this.getFullName(name)}`;
  }
}
