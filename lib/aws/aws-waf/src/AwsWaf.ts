import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { WAFV2 } from 'aws-sdk';

const wafPostfix = '-waf';

export interface IAwsNewWaf {
  name: string;
  lbArn: string;
}

export interface IAwsWaf {
  name: string;
  arn: string;
}

export interface IAwsWafConfigure {
  wafArn: string;
  lbArn: string;
}

export class AwsWaf extends AwsBase<typeof WAFV2> {
  public static async create(config: IAwsConfig) {
    return new AwsWaf(config);
  }

  private constructor(config: IAwsConfig) {
    super(config);
  }

  public async ensureWaf(newWaf: IAwsNewWaf): Promise<IAwsWaf> {
    let waf = await this.getWafOrUndefined(newWaf.name + wafPostfix);
    if (!waf) {
      waf = await this.createWaf(newWaf);
    }
    await this.configureWaf({
      lbArn: newWaf.lbArn,
      wafArn: waf.arn,
    });
    return waf;
  }

  protected onGetAws(options: any) {
    return new WAFV2(options);
  }

  private async configureWaf(wafConfigure: IAwsWafConfigure) {
    const wafSdk = await this.getAws();
    await wafSdk
      .associateWebACL({
        WebACLArn: wafConfigure.wafArn,
        ResourceArn: wafConfigure.lbArn,
      })
      .promise();
  }

  private async getWafOrUndefined(name: string): Promise<IAwsWaf | undefined> {
    const wafSdk = await this.getAws();
    const wafs = await wafSdk.listWebACLs({ Scope: 'REGIONAL' }).promise();
    if (!wafs || !wafs?.WebACLs) {
      return undefined;
    }
    for (const waf of wafs.WebACLs as WAFV2.WebACLSummaries) {
      if (waf.Name === name) {
        return {
          arn: waf.ARN as string,
          name: waf.Name as string,
        };
      }
    }
    return undefined;
  }

  private async createWaf(newWaf: IAwsNewWaf): Promise<IAwsWaf> {
    const wafSdk = await this.getAws();
    const waf = await wafSdk.createWebACL(this.getWafParams(newWaf)).promise();
    const newWafOut: IAwsWaf = {
      name: waf.Summary?.Name as string,
      arn: waf.Summary?.ARN as string,
    };
    return newWafOut;
  }

  private getWafParams(newWaf: IAwsNewWaf) {
    const params: WAFV2.CreateWebACLRequest = {
      Name: newWaf.name + wafPostfix,
      Scope: 'REGIONAL',
      DefaultAction: { Allow: {} },
      VisibilityConfig: {
        CloudWatchMetricsEnabled: true,
        SampledRequestsEnabled: true,
        MetricName: `fusebit-waf-${newWaf.name + wafPostfix}`,
      },
    };
    return params;
  }
}
