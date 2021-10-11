import { IAwsConfig } from '@5qtrs/aws-base';
import { WAFV2, DynamoDB } from 'aws-sdk';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { ExecuteService } from './';
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

  private async getWafOrError(deploymentName: string, region: string) {
    const wafSdk = await this.getWafSdk({ region });
    const wafs = await wafSdk.listWebACLs({ Scope: 'REGIONAL' }).promise();
    let waf = wafs.WebACLs?.find((waf) => waf.Name === deploymentName + wafPostfix);
    if (!waf) {
      throw Error('WAF not found, please re-run fuse-ops deployment add to ensure the WAF feature is enabled.');
    }
    let wafDetails = await wafSdk
      .getWebACL({ Scope: 'REGIONAL', Id: waf.Id as string, Name: waf.Name as string })
      .promise();
    return {
      WAF: wafDetails.WebACL as WAFV2.WebACL,
      LockToken: wafDetails.LockToken as string,
    };
  }

  private async unblockIP(deploymentName: string, region: string, ipaddr: string) {
    const wafSdk = await this.getWafSdk({ region });

    const IPSet = await this.getIPSetOrError(deploymentName, region);
    let IPs = IPSet.IPSet.Addresses;
    IPs = IPs?.filter((ip) => ip !== ipaddr);
    await wafSdk
      .updateIPSet({
        Scope: 'REGIONAL',
        Name: IPSet.IPSet.Name as string,
        Id: IPSet.IPSet.Id as string,
        Addresses: IPs as WAFV2.IPAddresses,
        LockToken: IPSet.LockToken as string,
      })
      .promise();
  }
  private async blockIP(deploymentName: string, region: string, ip: string) {
    const wafSdk = await this.getWafSdk({ region });
    const IPSet = await this.getIPSetOrError(deploymentName, region);
    await wafSdk
      .updateIPSet({
        Scope: 'REGIONAL',
        Name: IPSet.IPSet?.Name as string,
        Id: IPSet.IPSet?.Id as string,
        Addresses: [...(IPSet.IPSet?.Addresses as WAFV2.IPAddresses), ip],
        LockToken: IPSet.LockToken as string,
      })
      .promise();
  }
  public async getWafJson(deploymentName: string, region?: string) {
    const correctRegion = await this.ensureRegionOrError(deploymentName, region);
    const waf = await this.getWafOrError(deploymentName, correctRegion);
    await this.input.io.write(
      JSON.stringify({
        name: waf.WAF.Name as string,
        id: waf.WAF.Id as string,
      })
    );
  }
  private async getWafPretty(deploymentName: string, region: string) {
    const waf = await this.getWafOrError(deploymentName, region);
    await this.input.io.writeLine('Waf details:');
    await this.input.io.write(`The name of the waf is ${waf.WAF.Name} and id ${waf.WAF.Id}`);
  }
  private async getIPSetOrError(deploymentName: string, region: string) {
    const wafSdk = await this.getWafSdk({ region });
    const ipsets = await wafSdk
      .listIPSets({
        Scope: 'REGIONAL',
      })
      .promise();
    const ipset = ipsets.IPSets?.find((ipset) => ipset.Name === deploymentName + IPRuleSetPostFix);
    if (ipset) {
      const ipsetDetails = await wafSdk
        .getIPSet({ Scope: 'REGIONAL', Name: ipset.Name as string, Id: ipset.Id as string })
        .promise();
      return {
        IPSet: ipsetDetails.IPSet as WAFV2.IPSet,
        LockToken: ipsetDetails.LockToken as string,
      };
    }
    throw Error('IPSet not found, please re-run fuse-ops deployment add to ensure the WAF feature is enabled.');
  }

  private async removeRegexRuleSet(deploymentName: string, region: string, regexString: string) {
    this.validateRegex(regexString);
    const wafSdk = await this.getWafSdk({ region });
    const waf = await this.getWafOrError(deploymentName, region);
    let rules = waf.WAF.Rules as WAFV2.Rules;
    rules = rules.filter((rule) => rule.Statement.RegexMatchStatement?.RegexString !== regexString);
    await wafSdk
      .updateWebACL({
        Rules: rules,
        Name: waf.WAF.Name as string,
        Id: waf.WAF.Id as string,
        DefaultAction: waf.WAF.DefaultAction as WAFV2.DefaultAction,
        VisibilityConfig: waf.WAF.VisibilityConfig as WAFV2.VisibilityConfig,
        Scope: 'REGIONAL',
        LockToken: waf.LockToken as string,
      })
      .promise();
  }

  private async getRegExRules(deploymentName: string, region: string) {
    const wafSdk = await this.getWafSdk({ region });
    let waf = await this.getWafOrError(deploymentName, region);
    await this.input.io.writeLine('Regex filters applied to the Fusebit platform.');
    waf.WAF.Rules?.forEach(async (rule) => {
      if (rule.Statement?.RegexMatchStatement?.RegexString) {
        await this.input.io.writeLine(`- ${rule.Statement.RegexMatchStatement.RegexString}`);
      }
    });
  }

  private async getIPRules(deploymentName: string, region: string) {
    const wafSdk = await this.getWafSdk({ region });
    const ipset = await this.getIPSetOrError(deploymentName, region);
    await this.input.io.writeLine('IP filters applied to the Fusebit platform');
    ipset.IPSet?.Addresses.forEach(async (ip) => {
      await this.input.io.writeLine(`- ${ip}`);
    });
  }

  private async updateRegexRuleSet(deploymentName: string, region: string, regexString: string) {
    this.validateRegex(regexString);
    const waf = await this.getWafOrError(deploymentName, region);
    const wafSdk = await this.getWafSdk({ region });
    const rules = waf.WAF.Rules as WAFV2.Rules;
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
        Name: waf.WAF.Name as string,
        LockToken: waf.LockToken as string,
        DefaultAction: waf.WAF.DefaultAction as WAFV2.DefaultAction,
        Rules: rules,
        Scope: 'REGIONAL',
        Id: waf.WAF.Id as string,
        VisibilityConfig: waf.WAF.VisibilityConfig as WAFV2.VisibilityConfig,
      })
      .promise();
  }
  private validateRegex(regexString: string) {
    try {
      new RegExp(regexString);
    } catch (e) {
      throw Error('Invalid RegEx is inputted, please validate your RegEx.');
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
