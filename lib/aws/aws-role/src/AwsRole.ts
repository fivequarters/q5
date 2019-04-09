import { AwsBase, IAwsOptions } from '@5qtrs/aws-base';
import { IAM } from 'aws-sdk';

// -----------------
// Intenal Functions
// -----------------

function parseAssumeRolePolicyDocument(document: string): IAwsRolePrincipal {
  let principal: any;
  try {
    const json = JSON.parse(decodeURIComponent(document));
    principal = json.Statement[0].Principal;
  } catch (error) {
    // do nothing
  }

  if (principal) {
    if (principal.AWS && principal.AWS) {
      const account = typeof principal.AWS === 'string' ? principal.AWS : principal.AWS[0];
      return { account };
    }
    if (principal.Service && principal.Service) {
      const fullService = typeof principal.Service === 'string' ? principal.Service : principal.Service[0];
      const index = fullService.indexOf('.');
      if (index >= 0) {
        const shortService = fullService.substring(0, index);
        return { service: shortService as AwsRoleService };
      }
    }
  }

  return {};
}

function principalsAreEquivalent(principal1: IAwsRolePrincipal, principal2: IAwsRolePrincipal) {
  return principal1.account == principal2.account && principal1.service === principal2.service;
}

// -------------------
// Exported Interfaces
// -------------------

export enum AwsRoleService {
  lambda = 'lambda',
  edgeLambda = 'edgelambda',
  elb = 'elasticloadbalancing',
  ecs = 'ecs',
  autoScale = 'autoscaling',
  dynamo = 'dynamodb',
  api = 'apigateway',
}

export interface IAwsRolePolicy {
  actions: string[];
  resource: string;
}

export interface IAwsRolePrincipal {
  account?: string;
  service?: AwsRoleService;
}

export interface IAwsRoleOptions {
  path?: string;
  policies?: IAwsRolePolicy[];
}

export interface IAwsRoleDetail {
  id: string;
  name: string;
  path: string;
  arn: string;
  principal: IAwsRolePrincipal;
}

// ----------------
// Exported Classes
// ----------------

export class AwsRole extends AwsBase<typeof IAM> {
  public static async create(options: IAwsOptions) {
    return new AwsRole(options);
  }
  private constructor(options: IAwsOptions) {
    super(options);
  }

  public async ensureRole(
    name: string,
    principal: IAwsRolePrincipal,
    options?: IAwsRoleOptions
  ): Promise<IAwsRoleDetail> {
    const iam = await this.getAws();
    const path = options && options.path !== undefined ? options.path : '';
    const policies = options && options.policies !== undefined ? options.policies : [];

    const params = {
      AssumeRolePolicyDocument: this.getAssumeRolePolicyDocument(principal),
      Path: this.getPath(path),
      RoleName: this.getPrefixedName(name),
    };
    return new Promise((resolve, reject) => {
      iam.createRole(params, async (error: any, data: any) => {
        if (error && error.code !== 'EntityAlreadyExists') {
          return reject(error);
        }

        let roleDetail: IAwsRoleDetail;
        if (data) {
          roleDetail = {
            id: data.Role.RoleId,
            name: data.Role.RoleName,
            path: data.Role.Path,
            arn: data.Role.Arn,
            principal: parseAssumeRolePolicyDocument(data.AssumeRolePolicyDocument),
          };
        } else {
          try {
            roleDetail = await this.getRole(name);
            if (!principalsAreEquivalent(roleDetail.principal, principal)) {
              const existingPrincipal = roleDetail.principal.account
                ? `principal account value of '${roleDetail.principal.account}'`
                : `principal service value of '${roleDetail.principal.service}'`;
              const givenPrincipal = principal.account
                ? `principal account value is '${principal.account}'`
                : `principal service value is '${principal.service}'`;
              const message = [
                `The role '${name}' already exists but has an existing ${existingPrincipal}`,
                `while the given ${givenPrincipal}.`,
              ].join(' ');
              throw new Error(message);
            }
          } catch (error) {
            return reject(error);
          }
        }

        const params2 = {
          PolicyDocument: this.getPolicyDocument(policies),
          PolicyName: 'main-policy',
          RoleName: roleDetail.name,
        };

        iam.putRolePolicy(params2, (error2: any) => {
          if (error2) {
            return reject(error2);
          }

          resolve(roleDetail);
        });
      });
    });
  }

  public async getRole(name: string): Promise<IAwsRoleDetail> {
    const iam = await this.getAws();
    const params = {
      RoleName: this.getPrefixedName(name),
    };

    return new Promise((resolve, reject) => {
      iam.getRole(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const roleDetail = {
          id: data.Role.RoleId,
          name: data.Role.RoleName,
          path: data.Role.Path,
          arn: data.Role.Arn,
          principal: parseAssumeRolePolicyDocument(data.Role.AssumeRolePolicyDocument),
        };

        resolve(roleDetail);
      });
    });
  }

  public async listRoles(path?: string): Promise<IAwsRoleDetail[]> {
    const iam = await this.getAws();
    const fullPath = this.getPath(path);
    const params: any = {
      PathPrefix: fullPath,
    };

    const results: IAwsRoleDetail[] = [];

    return new Promise((resolve, reject) => {
      const func = () => {
        iam.listRoles(params, (error: any, data: any) => {
          if (error) {
            return reject(error);
          }

          for (const entry of data.Roles) {
            results.push({
              id: entry.RoleId,
              name: entry.RoleName,
              path: entry.Path,
              arn: entry.Arn,
              principal: parseAssumeRolePolicyDocument(data.AssumeRolePolicyDocument),
            });
          }

          if (data.Marker) {
            params.Marker = data.Marker;
            return func();
          }

          resolve(results);
        });
      };

      func();
    });
  }

  public async deleteRole(name: string): Promise<void> {
    const iam = await this.getAws();
    const params = {
      RoleName: this.getPrefixedName(name),
    };

    return new Promise((resolve, reject) => {
      iam.deleteRole(params, (error: any) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }

  protected onGetAws(options: any) {
    return new IAM(options);
  }

  private getAssumeRolePolicyDocument(principal: IAwsRolePrincipal) {
    if (principal.service !== undefined && principal.account !== undefined) {
      const message = [
        `The IAwsRolePrincipal is invalid as both the service, '${principal.service}', and`,
        `the account, '${principal.account}', properties are specified.`,
      ].join(' ');
      throw new Error(message);
    }

    const document: any = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {},
          Action: 'sts:AssumeRole',
        },
      ],
    };
    if (principal.service) {
      document.Statement[0].Principal = { Service: [`${principal.service.toString()}.amazonaws.com`] };
    } else if (principal.account) {
      document.Statement[0].Principal = { AWS: [principal.account] };
    }

    return JSON.stringify(document);
  }

  private getPolicyDocument(policies: IAwsRolePolicy[]) {
    const document: any = {
      Version: '2012-10-17',
      Statement: [],
    };
    for (const policy of policies) {
      document.Statement.push({
        Effect: 'Allow',
        Action: policy.actions,
        Resource: policy.resource,
      });
    }
    return JSON.stringify(document);
  }

  private getPath(path?: string) {
    return `/${this.deployment.key}${path ? '/' + path : ''}/`;
  }
}
