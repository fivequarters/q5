import { IAwsConfig } from '@5qtrs/aws-base';
import { WAFV2, DynamoDB } from 'aws-sdk';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { ExecuteService } from '.';
import { OpsService } from './OpsService';
import { v4 as uuidv4 } from 'uuid';
const wafPostfix = '-waf';
const IPRuleSetPostFix = '-ip-set';
export class WafService {
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    const opsDataContext = await opsSvc.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    return new WafService(opsSvc, execSvc, config, credentials, input);
  }

  private constructor(
    private opsService: OpsService,
    private executeService: ExecuteService,
    private config: IAwsConfig,
    private creds: IAwsCredentials,
    private input: IExecuteInput
  ) {}

  private async getWafSdk(config: any) {
    return new WAFV2({
      ...config,
      accessKeyId: this.creds.accessKeyId as string,
      secretAccessKey: this.creds.secretAccessKey as string,
      sessionToken: this.creds.sessionToken as string,
    });
  }

  private async getDynamoSDK(config: any) {
    return new DynamoDB({
      ...config,
      accessKeyId: this.creds.accessKeyId as string,
      secretAccessKey: this.creds.secretAccessKey as string,
      sessionToken: this.creds.sessionToken as string,
    });
  }

  private async getRegionOfDeployment(deploymentName: string): Promise<string | undefined> {
    const dynamoSdk = await this.getDynamoSDK({
      region: this.config.region,
    });
    const deployments = await dynamoSdk.scan({ TableName: 'ops.deployment' }).promise();
    if ((deployments.Count as number) === 0) {
      return undefined;
    }
    const item = deployments.Items?.filter((item) => item.deploymentName.S === deploymentName);
    if (!item || item.length === 0 || item.length > 1) {
      return undefined;
    }
    return item[0].region.S;
  }

  private async getWafOrUndefined(deploymentName: string, region: string) {
    const wafSdk = await this.getWafSdk({
      region,
    });
    const wafs = await wafSdk.listWebACLs({ Scope: 'REGIONAL' }).promise();
    const waf = wafs.WebACLs?.find((waf) => waf.Name === deploymentName + wafPostfix);
    return waf;
  }

  private async unblockIP(deploymentName: string, region: string, ipaddr: string) {
    const wafSdk = await this.getWafSdk({
      region,
    });

    const IPSet = await this.getIPSetOrUndefined(deploymentName, region);
    if (!IPSet) {
      throw Error('Can not find the IPSet, please re-run deployment add.');
    }
    const ipsetDetails = await wafSdk
      .getIPSet({
        Scope: 'REGIONAL',
        Name: IPSet.Name as string,
        Id: IPSet.Id as string,
      })
      .promise();

    let IPs = ipsetDetails.IPSet?.Addresses;
    IPs = IPs?.filter((ip) => ip !== ipaddr);
    await wafSdk
      .updateIPSet({
        Scope: 'REGIONAL',
        Name: IPSet.Name as string,
        Id: IPSet.Id as string,
        Addresses: IPs as WAFV2.IPAddresses,
        LockToken: ipsetDetails.LockToken as string,
      })
      .promise();
  }
  private async blockIP(deploymentName: string, region: string, ip: string) {
    const wafSdk = await this.getWafSdk({
      region,
    });
    const IPSet = await this.getIPSetOrUndefined(deploymentName, region);
    if (!IPSet) {
      throw Error('Can not find the IPSet, please re run deployment add.');
    }
    const ipsetDetails = await wafSdk
      .getIPSet({
        Scope: 'REGIONAL',
        Name: IPSet.Name as string,
        Id: IPSet.Id as string,
      })
      .promise();

    await wafSdk
      .updateIPSet({
        Scope: 'REGIONAL',
        Name: ipsetDetails.IPSet?.Name as string,
        Id: ipsetDetails.IPSet?.Id as string,
        Addresses: [...(ipsetDetails.IPSet?.Addresses as WAFV2.IPAddresses), ip],
        LockToken: ipsetDetails.LockToken as string,
      })
      .promise();
  }
  public async getWafJson(deploymentName: string, region?: string) {
    const correctRegion = await this.ensureRegionOrError(deploymentName, region);
    const waf = await this.getWafOrUndefined(deploymentName, correctRegion);
    if (!waf) {
      await this.input.io.write('{}');
      return;
    }
    await this.input.io.write(
      JSON.stringify({
        name: waf.Name as string,
        id: waf.Id as string,
      })
    );
  }
  private async getWafPretty(deploymentName: string, region: string) {
    const waf = await this.getWafOrUndefined(deploymentName, region);
    await this.input.io.writeLine('Waf details:');
    if (!waf) {
      return;
    }
    await this.input.io.write(`The name of the waf is ${waf.Name} and id ${waf.Id}`);
  }
  private async getIPSetOrUndefined(deploymentName: string, region: string) {
    const wafSdk = await this.getWafSdk({
      region,
    });
    const ipsets = await wafSdk
      .listIPSets({
        Scope: 'REGIONAL',
      })
      .promise();

    return ipsets.IPSets?.find((ipset) => ipset.Name === deploymentName + IPRuleSetPostFix);
  }

  private async removeRegexRuleSet(deploymentName: string, region: string, regexString: string) {
    if (!this.validateRegex(regexString)) {
      throw Error('Invalid RegEx string inputed.');
    }

    const waf = await this.getWafOrUndefined(deploymentName, region);
    if (!waf) {
      throw Error('Can not find WAF, please re-run fuse-ops deployment add to ensure WAF is enabled');
    }

    const wafSdk = await this.getWafSdk({
      region,
    });

    const wafDetails = await wafSdk
      .getWebACL({
        Scope: 'REGIONAL',
        Name: waf.Name as string,
        Id: waf.Id as string,
      })
      .promise();
    let rules = wafDetails.WebACL?.Rules as WAFV2.Rules;
    rules = rules.filter((rule) => rule.Statement.RegexMatchStatement?.RegexString !== regexString);
    await wafSdk
      .updateWebACL({
        Rules: rules,
        Name: wafDetails.WebACL?.Name as string,
        Id: wafDetails.WebACL?.Id as string,
        DefaultAction: wafDetails.WebACL?.DefaultAction as WAFV2.DefaultAction,
        VisibilityConfig: wafDetails.WebACL?.VisibilityConfig as WAFV2.VisibilityConfig,
        Scope: 'REGIONAL',
        LockToken: wafDetails.LockToken as string,
      })
      .promise();
  }

  private async getRegExRules(deploymentName: string, region: string) {
    const wafSdk = await this.getWafSdk({
      region,
    });
    let waf = await this.getWafOrUndefined(deploymentName, region);
    if (!waf) {
      throw Error('Can not find WAF, please re-run fuse-ops deployment add to ensure WAF is enabled.');
    }
    const wafDetails = await wafSdk
      .getWebACL({ Scope: 'REGIONAL', Name: waf.Name as string, Id: waf.Id as string })
      .promise();
    await this.input.io.writeLine('Regex filters applied to the Fusebit platform.');
    wafDetails.WebACL?.Rules?.forEach(async (rule) => {
      if (rule.Statement?.RegexMatchStatement?.RegexString) {
        await this.input.io.writeLine(`- ${rule.Statement.RegexMatchStatement.RegexString}`);
      }
    });
  }

  private async getIPRules(deploymentName: string, region: string) {
    const wafSdk = await this.getWafSdk({ region });
    const ipset = await this.getIPSetOrUndefined(deploymentName, region);
    if (!ipset) {
      throw Error('Can not find WAF, please re-run fuse-ops deployment add to ensure WAF is enabled.');
    }
    const ipsetDetails = await wafSdk
      .getIPSet({
        Scope: 'REGIONAL',
        Name: ipset.Name as string,
        Id: ipset.Id as string,
      })
      .promise();

    await this.input.io.writeLine('IP filters applied to the Fusebit platform');
    ipsetDetails.IPSet?.Addresses.forEach(async (ip) => {
      await this.input.io.writeLine(`- ${ip}`);
    });
  }

  private async updateRegexRuleSet(deploymentName: string, region: string, regexString: string) {
    if (!this.validateRegex(regexString)) {
      throw Error('Invalid RegEx string inputed.');
    }
    const waf = await this.getWafOrUndefined(deploymentName, region);
    if (!waf) {
      throw Error('Can not find WAF, please re-run fuse-ops deployment add to ensure WAF is enabled.');
    }
    const wafSdk = await this.getWafSdk({
      region,
    });
    const wafDetails = await wafSdk
      .getWebACL({ Scope: 'REGIONAL', Name: waf.Name as string, Id: waf.Id as string })
      .promise();
    const rules = wafDetails.WebACL?.Rules as WAFV2.Rules;
    rules.push({
      Name: uuidv4(),
      Priority: Math.floor(Math.random() * 999),
      Statement: {
        RegexMatchStatement: {
          RegexString: regexString,
          FieldToMatch: { UriPath: {} },
          TextTransformations: [{ Priority: 0, Type: 'NONE' }],
        },
      },
      Action: { Block: {} },
      VisibilityConfig: { CloudWatchMetricsEnabled: false, SampledRequestsEnabled: false, MetricName: uuidv4() },
    });
    await wafSdk
      .updateWebACL({
        Name: wafDetails.WebACL?.Name as string,
        LockToken: wafDetails.LockToken as string,
        DefaultAction: wafDetails.WebACL?.DefaultAction as WAFV2.DefaultAction,
        Rules: rules,
        Scope: 'REGIONAL',
        Id: wafDetails.WebACL?.Id as string,
        VisibilityConfig: wafDetails.WebACL?.VisibilityConfig as WAFV2.VisibilityConfig,
      })
      .promise();
  }
  private validateRegex(regexString: string) {
    try {
      new RegExp(regexString);
      return true;
    } catch (_) {
      return false;
    }
  }

  public async blockIPFromWaf(deploymentName: string, ip: string, region?: string) {
    let correctRegion = await this.ensureRegionOrError(deploymentName, region);
    return this.executeService.execute(
      {
        header: 'Blocking IP from the Fusebit platform',
        message: 'Blocking the IP from the Fusebit platform',
        errorHeader: 'Blocking the IP failed',
      },
      () => this.blockIP(deploymentName, correctRegion, ip)
    );
  }

  public async blockRegExFromWaf(deploymentName: string, regex: string, region?: string) {
    let correctRegion = await this.ensureRegionOrError(deploymentName, region);
    return this.executeService.execute(
      {
        header: 'Blocking RegEx from the Fusebit platform',
        message: 'Blocking the path RegEx from the Fusebit platform',
        errorHeader: 'Blocking the RegEx failed',
      },
      () => this.updateRegexRuleSet(deploymentName, correctRegion, regex)
    );
  }

  public async unblockRegExFromWaf(deploymentName: string, regex: string, region?: string) {
    let correctRegion = await this.ensureRegionOrError(deploymentName, region);
    return this.executeService.execute(
      {
        header: 'Unblocking RegEx from the Fusebit platform',
        message: 'Unblocking the path RegEx from the Fusebit platform',
        errorHeader: 'Unblocking the RegEx failed',
      },
      () => this.removeRegexRuleSet(deploymentName, correctRegion, regex)
    );
  }

  public async ListRegExFromWaf(deploymentName: string, region?: string) {
    let correctRegion = await this.ensureRegionOrError(deploymentName, region);
    return this.executeService.execute(
      {
        header: 'Listing RegEx filters from the Fusebit platform',
        message: 'Listing the path RegEx filters from the Fusebit platform',
        errorHeader: 'Listing the RegEx failed',
      },
      () => this.getRegExRules(deploymentName, correctRegion)
    );
  }

  public async ListIPFromWaf(deploymentName: string, region?: string) {
    let correctRegion = await this.ensureRegionOrError(deploymentName, region);
    return this.executeService.execute(
      {
        header: 'Listing IP filters from the Fusebit platform',
        message: 'Listing the IP filters from the Fusebit platform',
        errorHeader: 'Listing the IP failed',
      },
      () => this.getIPRules(deploymentName, correctRegion)
    );
  }

  public async unblockIPFromWaf(deploymentName: string, ip: string, region?: string) {
    let correctRegion = await this.ensureRegionOrError(deploymentName, region);
    return this.executeService.execute(
      {
        header: 'Unblocking IP from the Fusebit platform',
        message: 'Unblocking the IP from the Fusebit platform',
        errorHeader: 'Unblocking the IP failed',
      },
      () => this.unblockIP(deploymentName, correctRegion, ip)
    );
  }

  public async getWaf(deploymentName: string, region?: string) {
    let correctRegion = await this.ensureRegionOrError(deploymentName, region);
    if (this.input.options?.output === 'json') {
      await this.getWafJson(deploymentName, correctRegion);
      return;
    }
    return this.executeService.execute(
      {
        header: 'Get WAF Information',
        message: 'Getting the information of the AWS WAF resource.',
        errorHeader: 'WAF Error',
      },
      () => this.getWafPretty(deploymentName, correctRegion)
    );
  }

  public async confirmBlockRegex(regex: string) {
    const confirmPrompt = await Confirm.create({
      header: 'Apply the RegEx filter to the Fusebit platform?',
      details: [{ name: 'RegEx filter', value: regex }],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'RegEx filter apply canceled',
        'Applying the RegEx filter to the Fusebit platform was canceled.'
      );
      throw Error('RegEx Filter Canceled');
    }
  }

  public async confirmUnblockRegex(regex: string) {
    const confirmPrompt = await Confirm.create({
      header: 'Remove the RegEx filter to the Fusebit platform?',
      details: [{ name: 'RegEx filter', value: regex }],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'RegEx filter removal canceled',
        'Removing the RegEx filter to the Fusebit platform was canceled.'
      );
      throw Error('RegEx Filter Removal Canceled');
    }
  }

  public async confirmBlockIP(ip: string) {
    const confirmPrompt = await Confirm.create({
      header: 'Apply the IP subnet filter to the Fusebit platform?',
      details: [{ name: 'IP', value: ip }],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'IP filter apply canceled',
        'Applying the IP filter to the Fusebit platform was canceled.'
      );
      throw Error('IP Filter Canceled');
    }
  }

  public async confirmUnblockIP(ip: string) {
    const confirmPrompt = await Confirm.create({
      header: 'Remove the IP subnet filter to the Fusebit platform?',
      details: [{ name: 'IP', value: ip }],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'IP filter removal canceled',
        'Removing the IP filter to the Fusebit platform was canceled.'
      );
      throw Error('IP Filter Removal Canceled');
    }
  }

  private async ensureRegionOrError(deploymentName?: string, region?: string) {
    if (region) {
      return region;
    }

    if (deploymentName) {
      const reg = await this.getRegionOfDeployment(deploymentName);
      if (reg) {
        return reg;
      }
    }

    throw Error('Deployment region not found.');
  }
}
