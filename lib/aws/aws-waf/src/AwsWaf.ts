import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { WAFV2 } from 'aws-sdk';

const wafPostfix = '-waf';
const IPRuleSetPostFix = '-ip-set';
const RuleGroupPostFix = '-group';
export interface IAwsNewWaf {
  name: string;
  lbArn: string;
  ipsetArn?: string;
}
export interface IAwsWaf {
  name: string;
  arn: string;
}

export interface IAwsWafConfigure {
  wafArn: string;
  lbArn: string;
}

export interface IAwsIpSet {
  name: string;
  arn: string;
}
export class AwsWaf extends AwsBase<typeof WAFV2> {
  public static async create(config: IAwsConfig) {
    return new AwsWaf(config);
  }

  private constructor(config: IAwsConfig) {
    super(config);
  }

  public async ensureWaf(newWaf: IAwsNewWaf): Promise<IAwsWaf> {
    let ipset = await this.getAwsIpSetOrUndefined(newWaf);
    if (!ipset) {
      ipset = await this.createAwsIpSet(newWaf);
    }
    let waf = await this.getWafOrUndefined(newWaf.name + wafPostfix);
    if (!waf) {
      waf = await this.createWaf({
        ...newWaf,
        ipsetArn: ipset.arn,
      });
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
    const waf = wafs.WebACLs?.find((waf) => {
      return waf.Name === name;
    });
    if (waf) {
      return { name: waf.Name as string, arn: waf.ARN as string };
    } else {
      return undefined;
    }
  }

  private async createWaf(newWaf: IAwsNewWaf): Promise<IAwsWaf> {
    const wafSdk = await this.getAws();
    const wafRuleGroup = await wafSdk.createRuleGroup({
      Name: newWaf.name + RuleGroupPostFix,
      Scope: 'REGIONAL',
      Capacity: 20,
      VisibilityConfig: {
        CloudWatchMetricsEnabled: true,
        SampledRequestsEnabled: true,
        MetricName: `fusebit-waf-${newWaf.name + RuleGroupPostFix}`,
      },
    });
    const waf = await wafSdk
      .createWebACL({
        ...this.getWafParams(newWaf),
        Rules: [
          {
            Name: 'DisableIPRule',
            Priority: 0,
            Statement: {
              IPSetReferenceStatement: {
                ARN: newWaf.ipsetArn as string,
              },
            },
            Action: {
              Block: {},
            },
            VisibilityConfig: {
              CloudWatchMetricsEnabled: true,
              SampledRequestsEnabled: true,
              MetricName: `fusebit-waf-rule-${newWaf.name + RuleGroupPostFix}`,
            },
          },
        ],
      })
      .promise();
    return {
      name: waf.Summary?.Name as string,
      arn: waf.Summary?.ARN as string,
    };
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

  private async getAwsIpSetOrUndefined(newWaf: IAwsNewWaf): Promise<IAwsIpSet | undefined> {
    const wafSdk = await this.getAws();
    const ruleSets = await wafSdk.listIPSets({ Scope: 'REGIONAL' }).promise();
    const ipset = ruleSets?.IPSets?.find((ipset) => {
      return ipset.Name === newWaf.name + IPRuleSetPostFix;
    });
    if (ipset) {
      return { name: ipset.Name as string, arn: ipset.ARN as string };
    } else {
      return undefined;
    }
  }

  private async createAwsIpSet(newWaf: IAwsNewWaf) {
    const wafSdk = await this.getAws();
    const ipset = await wafSdk
      .createIPSet({
        Name: newWaf.name + IPRuleSetPostFix,
        IPAddressVersion: 'IPV4',
        Scope: 'REGIONAL',
        Addresses: [],
      })
      .promise();
    return {
      name: ipset.Summary?.Name as string,
      arn: ipset.Summary?.ARN as string,
    };
  }
}
