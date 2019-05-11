import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { ELBv2 } from 'aws-sdk';

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsAlbSettings {
  certArns: string[];
  subnets: string[];
  securityGroups: string[];
  lambdas?: IAwsAlbLambdaTarget[];
  name?: string;
}

export interface IAwsAlbLambdaTarget {
  name: string;
  arn: string;
  paths: string[];
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

  public async ensureAlb(settings: IAwsAlbSettings): Promise<string> {
    const name = settings.name || '';
    const albArn = await this.createAlb(name, settings.subnets, settings.securityGroups);

    const listenerArn = await this.createListener(albArn, settings.certArns);
    await this.createHttpRedirect(albArn);

    const lambdas = settings.lambdas ? settings.lambdas : [];
    const priority = 0;
    for (const lambda of lambdas) {
      const targetGroupArn = await this.createLambdaTargetGroup(name, lambda.name);
      await this.registerLambdaTarget(targetGroupArn, lambda.arn);
      await this.createPathForwardRule(listenerArn, lambda.paths, priority, targetGroupArn);
    }

    return albArn;
  }

  protected onGetAws(options: any) {
    return new ELBv2(options);
  }

  private async createLambdaTargetGroup(name: string, groupName: string): Promise<string> {
    const elb = await this.getAws();
    const fullName = this.getTargetGroupName(groupName);
    const params = {
      Name: fullName,
      TargetType: 'lambda',
      Protocol: 'HTTP',
    };

    return new Promise((resolve, reject) => {
      elb.createTargetGroup(params, (error: any, data: any) => {
        if (error) {
          reject(error);
        }

        resolve(data.TargetGroups[0].TargetGroupArn);
      });
    });
  }

  private async createPathForwardRule(
    listenerArn: string,
    paths: string[],
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
      Conditions: paths.map(path => ({ Field: 'path-pattern', Values: [path] })),
      ListenerArn: listenerArn,
      Priority: priority,
    };

    return new Promise((resolve, reject) => {
      elb.createRule(params, (error: any, data: any) => {
        if (error) {
          reject(error);
        }

        resolve(data.Rules[0].RuleArn);
      });
    });
  }

  private async createListener(albArn: string, certArns?: string[]): Promise<string> {
    const elb = await this.getAws();
    const params: any = {
      LoadBalancerArn: albArn,
      Port: 443,
      Protocol: 'HTTPS',
      DefaultActions: [
        {
          Type: 'fixed-response',
          FixedResponseConfig: {
            MessageBody: '{ "message": "Not Found" }',
            StatusCode: '404',
            ContentType: 'application/json',
          },
        },
      ],
    };

    if (certArns && certArns.length) {
      params.Certificates = certArns.map(arn => ({ CertificateArn: arn }));
    }

    return new Promise((resolve, reject) => {
      elb.createListener(params, (error: any, data: any) => {
        if (error) {
          reject(error);
        }

        resolve(data.Listeners[0].ListenerArn);
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
          reject(error);
        }

        resolve();
      });
    });
  }

  private async registerLambdaTarget(targetGroupArn: string, lambdaArn: string): Promise<void> {
    const elb = await this.getAws();
    const params = {
      TargetGroupArn: targetGroupArn,
      Targets: [
        {
          Id: lambdaArn,
          AvailabilityZone: 'all',
          Port: 0,
        },
      ],
    };

    return new Promise((resolve, reject) => {
      elb.registerTargets(params, (error: any, data: any) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });
  }

  private async createAlb(name: string, subnetIds: string[], securityGroups: string[]): Promise<string> {
    const elb = await this.getAws();
    const fullName = this.getAlbName();
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
          reject(error);
        }

        resolve(data.LoadBalancers[0].LoadBalancerArn);
      });
    });
  }

  private getAlbName() {
    return this.getFullName('alb');
  }

  private getTargetGroupName(group: string) {
    return this.getFullName(`${group}-tg`);
  }
}
