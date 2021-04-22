import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { ELBv2 } from 'aws-sdk';
import { AwsAlbException } from './AwsAlbException';

// -------------------
// Internal Constants
// -------------------

const albNamePostfix = '-alb';
const tgNamePostfix = '-tg';

// -------------------
// Internal Interfaces
// -------------------

interface IAwsAlbRule {
  arn: string;
  targetGroupArn: string;
  priority: number;
}

// ------------------
// Internal Functions
// ------------------

function isPriorityAvailable(priority: number, rules: IAwsAlbRule[]): boolean {
  for (const rule of rules) {
    if (rule.priority === priority) {
      return false;
    }
  }
  return true;
}

function getNextPriority(rules: IAwsAlbRule[]): number {
  let nextPriority = 1;
  while (!isPriorityAvailable(nextPriority, rules)) {
    nextPriority++;
  }
  return nextPriority;
}

function getRuleForTarget(targetGroupArn: string, rules: IAwsAlbRule[]): string | undefined {
  for (const rule of rules) {
    if (rule.targetGroupArn === targetGroupArn) {
      return rule.arn;
    }
  }
  return undefined;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsNewAlb {
  name: string;
  vpcId: string;
  certArns: string[];
  subnets: string[];
  securityGroups: string[];
  defaultTarget: IAwsNewAlbTargetGroup;
}

export interface IAwsNewAlbTargetGroup {
  name: string;
  port: number;
  host?: string;
  healthCheck?: {
    path: string;
    port?: number;
    successCodes?: string[];
  };
}

export interface IAwsAlb {
  arn: string;
  name: string;
  vpcId: string;
  state: string;
  listenerArn: string;
  dns: {
    name: string;
    hostedZone: string;
  };
  targets: { [index: string]: string };
}

// ----------------
// Exported Classes
// ----------------

export class AwsAlb extends AwsBase<typeof ELBv2> {
  public static async create(config: IAwsConfig) {
    return new AwsAlb(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  public async ensureAlb(newAlb: IAwsNewAlb): Promise<IAwsAlb> {
    let alb = (await this.getAlbOrUndefined(newAlb.name)) || (await this.createAlb(newAlb));
    await this.configureLoadBalancer(alb);
    return alb;
  }

  public async getAlb(name: string): Promise<IAwsAlb> {
    const alb = await this.getAlbOrUndefined(name);
    if (!alb) {
      throw AwsAlbException.noAlb(name);
    }
    return alb;
  }

  public async addTarget(albName: string, newTargetGroup: IAwsNewAlbTargetGroup): Promise<string> {
    const alb = await this.getAlb(albName);
    if (!alb) {
      throw AwsAlbException.noAlb(albName);
    }

    const targetGroupArn = await this.createTargetGroup(alb, newTargetGroup);
    const rules = await this.getRules(alb.listenerArn);
    const priority = getNextPriority(rules);

    if (!newTargetGroup.host) {
      throw AwsAlbException.hostRequired(albName, newTargetGroup.name);
    }

    await this.createHostForwardRule(alb.listenerArn, newTargetGroup.host, priority, targetGroupArn);
    return targetGroupArn;
  }

  public async removeTarget(albName: string, targetGroupName: string): Promise<void> {
    const alb = await this.getAlb(albName);
    if (!alb) {
      throw AwsAlbException.noAlb(albName);
    }

    const targetGroupArn = alb.targets[targetGroupName];
    if (!targetGroupArn) {
      throw AwsAlbException.noTargetGroup(albName, targetGroupName);
    }

    const rules = await this.getRules(alb.listenerArn);
    const ruleArn = getRuleForTarget(targetGroupArn, rules);
    if (ruleArn) {
      await this.deleteRule(ruleArn);
    }

    await this.deleteTargetGroup(targetGroupArn);
  }

  protected onGetAws(options: any) {
    return new ELBv2(options);
  }

  private async getRules(listenerArn: string): Promise<IAwsAlbRule[]> {
    const elb = await this.getAws();
    const params = {
      ListenerArn: listenerArn,
    };

    return new Promise((resolve, reject) => {
      elb.describeRules(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const rules = [];

        for (const rule of data.Rules) {
          rules.push({
            arn: rule.RuleArn,
            priority: parseInt(rule.Priority, 10),
            targetGroupArn: rule.Actions[0].TargetGroupArn,
          });
        }

        resolve(rules);
      });
    });
  }

  private async createHostForwardRule(
    listenerArn: string,
    host: string,
    priority: number,
    targetGroupArn: string
  ): Promise<void> {
    const elb = await this.getAws();
    const params = {
      Actions: [
        {
          TargetGroupArn: targetGroupArn,
          Type: 'forward',
        },
      ],
      Conditions: [{ Field: 'host-header', HostHeaderConfig: { Values: [host] } }],
      ListenerArn: listenerArn,
      Priority: priority,
    };

    return new Promise((resolve, reject) => {
      // @ts-ignore - AWS type definition is incorrect
      elb.createRule(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        resolve(data.Rules[0].RuleArn);
      });
    });
  }

  private async createHttpRedirect(albArn: string): Promise<void> {
    const elb = await this.getAws();
    const params = {
      LoadBalancerArn: albArn,
      Port: 80,
      Protocol: 'HTTP',
      DefaultActions: [
        {
          Type: 'redirect',
          RedirectConfig: {
            Host: '#{host}',
            Path: '/#{path}',
            Port: '443',
            Protocol: 'HTTPS',
            Query: '#{query}',
            StatusCode: 'HTTP_301',
          },
        },
      ],
    };

    return new Promise((resolve, reject) => {
      // @ts-ignore -- AWS type definition is incorrect
      elb.createListener(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }

  private async getAlbOrUndefined(name: string): Promise<IAwsAlb | undefined> {
    const alb = await this.getLoadBalancer(name);
    if (alb) {
      await this.waitForAlb(alb.arn);
      alb.listenerArn = await this.getHttpsListenerArn(name, alb.arn);
      return this.attachTargets(name, alb);
    }
    return undefined;
  }

  private async attachTargets(albName: string, alb: IAwsAlb): Promise<IAwsAlb> {
    const elb = await this.getAws();
    const params = {
      LoadBalancerArn: alb.arn,
    };

    return new Promise((resolve, reject) => {
      elb.describeTargetGroups(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        for (const targetGroup of data.TargetGroups) {
          const arn = targetGroup.TargetGroupArn;
          const fullName = targetGroup.TargetGroupName;
          const name = this.getTargetGroupShortName(albName, fullName);
          alb.targets[name] = arn;
        }

        resolve(alb);
      });
    });
  }

  private async getHttpsListenerArn(albName: string, albArn: string): Promise<string> {
    const elb = await this.getAws();
    const params = {
      LoadBalancerArn: albArn,
    };

    return new Promise((resolve, reject) => {
      elb.describeListeners(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        for (const listener of data.Listeners) {
          if (listener.Protocol === 'HTTPS') {
            return resolve(listener.ListenerArn);
          }
        }

        throw AwsAlbException.noHttpsListener(albName);
      });
    });
  }

  private async waitForAlb(albArn: string): Promise<void> {
    const elb = await this.getAws();
    const params = {
      LoadBalancerArns: [albArn],
    };

    return new Promise((resolve, reject) => {
      elb.waitFor('loadBalancerAvailable', params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async getLoadBalancer(name: string): Promise<IAwsAlb | undefined> {
    const elb = await this.getAws();
    const params = {
      Names: [this.getAlbFullName(name)],
    };

    return new Promise((resolve, reject) => {
      elb.describeLoadBalancers(params, (error: any, data: any) => {
        if (error) {
          if (error.code === 'LoadBalancerNotFound') {
            return resolve(undefined);
          }
          return reject(error);
        }

        let alb = undefined;
        if (data.LoadBalancers && data.LoadBalancers[0]) {
          const loadBalancer = data.LoadBalancers[0];
          alb = {
            name,
            arn: loadBalancer.LoadBalancerArn,
            vpcId: loadBalancer.VpcId,
            state: loadBalancer.State.Code,
            listenerArn: '',
            dns: {
              name: loadBalancer.DNSName,
              hostedZone: loadBalancer.CanonicalHostedZoneId,
            },
            targets: {},
          };
        }

        resolve(alb);
      });
    });
  }

  private async deleteRule(ruleArn: string): Promise<void> {
    const elb = await this.getAws();
    const params = {
      RuleArn: ruleArn,
    };

    return new Promise((resolve, reject) => {
      elb.deleteRule(params, (error: any) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }

  private async deleteTargetGroup(targetGroupArn: string): Promise<void> {
    const elb = await this.getAws();
    const params = {
      TargetGroupArn: targetGroupArn,
    };

    return new Promise((resolve, reject) => {
      elb.deleteTargetGroup(params, (error: any) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }

  private async createAlb(newAlb: IAwsNewAlb): Promise<IAwsAlb> {
    const alb = await this.createLoadBalancer(newAlb.name, newAlb.subnets, newAlb.securityGroups);
    await this.waitForAlb(alb.arn);

    const targetArn = await this.createTargetGroup(alb, newAlb.defaultTarget);
    alb.targets[newAlb.defaultTarget.name] = targetArn;

    alb.listenerArn = await this.createListener(alb.arn, targetArn, newAlb.certArns);
    await this.createHttpRedirect(alb.arn);

    return alb;
  }

  private async createTargetGroup(alb: IAwsAlb, targetGroup: IAwsNewAlbTargetGroup): Promise<string> {
    const elb = await this.getAws();
    const fullName = this.getTargetGroupFullName(alb.name, targetGroup.name);
    const params = {
      Name: fullName,
      VpcId: alb.vpcId,
      Port: targetGroup.port,
      Protocol: 'HTTP',
      HealthCheckProtocol: 'HTTP',
      HealthCheckPort: targetGroup.healthCheck
        ? (targetGroup.healthCheck.port || targetGroup.port).toString()
        : undefined,
      HealthCheckEnabled: targetGroup.healthCheck ? true : false,
      HealthCheckPath: targetGroup.healthCheck ? targetGroup.healthCheck.path : undefined,
      Matcher: targetGroup.healthCheck
        ? { HttpCode: targetGroup.healthCheck.successCodes ? targetGroup.healthCheck.successCodes.join() : '200' }
        : undefined,
      TargetType: 'instance',
    };

    return new Promise((resolve, reject) => {
      elb.createTargetGroup(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        resolve(data.TargetGroups[0].TargetGroupArn);
      });
    });
  }

  private async createListener(albArn: string, defaultTargetGroupArn: string, certArns: string[]): Promise<string> {
    const elb = await this.getAws();
    const params: any = {
      LoadBalancerArn: albArn,
      Port: 443,
      Protocol: 'HTTPS',
      DefaultActions: [
        {
          Type: 'forward',
          TargetGroupArn: defaultTargetGroupArn,
        },
      ],
    };

    if (certArns.length) {
      params.Certificates = certArns.map((arn) => ({ CertificateArn: arn }));
    }

    return new Promise((resolve, reject) => {
      elb.createListener(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        resolve(data.Listeners[0].ListenerArn);
      });
    });
  }

  private async configureLoadBalancer(alb: IAwsAlb): Promise<IAwsAlb> {
    const elb = await this.getAws();
    const params = {
      LoadBalancerArn: alb.arn,
      Attributes: [
        {
          Key: 'idle_timeout.timeout_seconds',
          // Prevent accidental timeouts on 120 second function executions with a 5 second buffer.
          Value: '125',
        },
      ],
    };
    return new Promise((resolve, reject) => {
      elb.modifyLoadBalancerAttributes(params, (error, data) => {
        if (error) {
          return reject(error);
        }
        resolve(alb);
      });
    });
  }

  private async createLoadBalancer(name: string, subnetIds: string[], securityGroups: string[]): Promise<IAwsAlb> {
    const elb = await this.getAws();
    const fullName = this.getAlbFullName(name);
    const params = {
      Name: fullName,
      Scheme: 'internet-facing',
      SecurityGroups: securityGroups,
      Subnets: subnetIds,
      Type: 'application',
      Tags: [
        {
          Key: 'Name',
          Value: fullName,
        },
      ],
    };

    return new Promise((resolve, reject) => {
      elb.createLoadBalancer(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const loadBalancer = data.LoadBalancers[0];
        const alb = {
          name,
          arn: loadBalancer.LoadBalancerArn,
          vpcId: loadBalancer.VpcId,
          state: loadBalancer.State.Code,
          dns: {
            name: loadBalancer.DNSName,
            hostedZone: loadBalancer.CanonicalHostedZoneId,
          },
          listenerArn: '',
          targets: {},
        };

        resolve(alb);
      });
    });
  }

  private getAlbFullName(name: string) {
    return this.getFullName(`${name}${albNamePostfix}`);
  }

  private getTargetGroupFullName(name: string, groupName: string) {
    return this.getFullName(`${name}-${groupName}${tgNamePostfix}`);
  }

  private getTargetGroupShortName(albName: string, fullName: string) {
    const shortName = this.getShortName(fullName);
    return shortName.substring(albName.length + 1, shortName.length - tgNamePostfix.length);
  }
}
