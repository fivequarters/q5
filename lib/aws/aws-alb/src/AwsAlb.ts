import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { AwsNetwork } from '@5qtrs/aws-network';
import { ELBv2 } from 'aws-sdk';

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsAlbOptions {
  albName?: string;
  certArns?: string[];
  lambdas?: IAwsAlbLambdaTarget[];
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

  public async ensureAlb(networkName: string, options?: IAwsAlbOptions): Promise<string> {
    const awsNetwork = await AwsNetwork.create(this.config);
    const network = await awsNetwork.ensureNetwork(networkName);

    const albName = options && options.albName ? options.albName : '';
    const subnets = network.publicSubnets.map(subnet => subnet.id);
    const albArn = await this.createAlb(albName, subnets, network.securityGroupId);

    const certArns = options && options.certArns ? options.certArns : undefined;
    const listenerArn = await this.createListener(albArn, certArns);
    if (certArns && certArns.length) {
      await this.createHttpRedirect(albArn);
    }

    const lambdas = options && options.lambdas ? options.lambdas : [];
    const priority = 0;
    for (const lambda of lambdas) {
      const targetGroupArn = await this.createLambdaTargetGroup(albName, lambda.name);
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
    const fullName = this.getTargetGroupName(name, groupName, 'tg');
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
      Port: certArns && certArns.length ? 443 : 80,
      Protocol: certArns && certArns.length ? 'HTTPS' : 'HTTP',
      DefaultActions: [
        {
          Type: 'fixed-response',
          FixedResponseConfig: {
            MessageBody: '{ "status": 404, message": "resource not found" }',
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

  private async createAlb(name: string, subnetIds: string[], securityGroupId: string): Promise<string> {
    const elb = await this.getAws();
    const fullName = this.getAlbName(name, 'alb');
    const params = {
      Name: fullName,
      Scheme: 'internet-facing',
      SecurityGroups: [securityGroupId],
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

  private getAlbName(name: string, type: string) {
    const fullName = this.getFullName(name);
    return `${fullName}-${type}`;
  }

  private getTargetGroupName(name: string, group: string, type: string) {
    const fullName = this.getFullName(name);
    return `${fullName}-${group}-${type}`;
  }
}
