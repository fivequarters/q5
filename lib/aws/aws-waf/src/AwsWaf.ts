import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { WAFV2 } from 'aws-sdk';

export const wafSuffix = '-waf';
export const IPRuleSetSuffix = '-ip-set';

export const getWafName = (deploymentName: string): string => {
  return deploymentName + wafSuffix;
};

export const getIPSetName = (deploymentName: string): string => {
  return deploymentName + IPRuleSetSuffix;
};

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
    let wafName = getWafName(newWaf.name);
    let waf = await this.getWafOrUndefined(wafName);
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
    let success = false;
    do {
      try {
        await wafSdk
          .associateWebACL({
            WebACLArn: wafConfigure.wafArn,
            ResourceArn: wafConfigure.lbArn,
          })
          .promise();
        success = true;
      } catch (e) {
        if (e && (e.code === 'WAFUnavailableEntityException' || e.code === 'ThrottlingException')) {
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        }
        throw e;
      }
    } while (!success);
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
              MetricName: `fusebit-waf-rule-${getIPSetName(newWaf.name)}`,
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
      Name: getWafName(newWaf.name),
      Scope: 'REGIONAL',
      DefaultAction: { Allow: {} },
      VisibilityConfig: {
        CloudWatchMetricsEnabled: true,
        SampledRequestsEnabled: true,
        MetricName: `fusebit-waf-${this.getWafName(newWaf.name)}`,
      },
    };
    return params;
  }

  private async getAwsIpSetOrUndefined(newWaf: IAwsNewWaf): Promise<IAwsIpSet | undefined> {
    const wafSdk = await this.getAws();
    const ruleSets = await wafSdk.listIPSets({ Scope: 'REGIONAL' }).promise();
    const ipset = ruleSets?.IPSets?.find((ipset) => {
      return ipset.Name === newWaf.name + IPRuleSetSuffix;
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
        Name: newWaf.name + IPRuleSetSuffix,
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
