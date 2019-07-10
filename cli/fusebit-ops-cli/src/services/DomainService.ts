import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { IOpsDomain, IListOpsDomainOptions, IListOpsDomainResult } from '@5qtrs/ops-data';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';

// ----------------
// Exported Classes
// ----------------

export class DomainService {
  private input: IExecuteInput;
  private opsService: OpsService;
  private executeService: ExecuteService;

  private constructor(input: IExecuteInput, opsService: OpsService, executeService: ExecuteService) {
    this.input = input;
    this.opsService = opsService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const opsService = await OpsService.create(input);
    const executeService = await ExecuteService.create(input);
    return new DomainService(input, opsService, executeService);
  }

  public async checkDomainExists(domain: IOpsDomain): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const domainData = opsDataContext.domainData;

    const exists = await this.executeService.execute(
      {
        header: 'Domain Check',
        message: `Determining if the '${Text.bold(domain.domainName)}' domain already exists...`,
        errorHeader: 'Domain Error',
      },
      () => domainData.exists(domain)
    );

    if (exists) {
      this.executeService.warning('Domain Exists', `There is already a '${Text.bold(domain.domainName)}' domain`);
      throw Error('Domain already Exists');
    }
  }

  public async getDomain(name: string): Promise<IOpsDomain> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const domainData = opsDataContext.domainData;

    const domain = await this.executeService.execute(
      {
        header: 'Get Domain',
        message: `Getting the '${Text.bold(name)}' domain...`,
        errorHeader: 'Domain Error',
      },
      () => domainData.get(name)
    );

    return domain as IOpsDomain;
  }

  public async confirmAddDomain(domain: IOpsDomain) {
    const confirmPrompt = await Confirm.create({
      header: 'Add the domain to the Fusebit platform?',
      details: [{ name: 'Domain', value: domain.domainName }, { name: 'Account', value: domain.accountName }],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Add Canceled',
        Text.create('Adding the domain to the Fusebit platform was canceled')
      );
      throw new Error('Add Canceled');
    }
  }

  public async addDomain(domain: IOpsDomain): Promise<IOpsDomain> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const domainData = opsDataContext.domainData;

    const domainWithNameServers = await this.executeService.execute(
      {
        header: 'Add Domain',
        message: `Adding the '${Text.bold(domain.domainName)}' domain to the Fusebit platform...`,
        errorHeader: 'Domain Error',
      },
      () => domainData.add(domain)
    );

    this.executeService.result(
      'Domain Added',
      `The '${Text.bold(domain.domainName)}' domain was successfully added to Fusebit platform`
    );

    return domainWithNameServers as IOpsDomain;
  }

  public async listAllDomains(): Promise<IOpsDomain[]> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const domainData = opsDataContext.domainData;

    const result = await this.executeService.execute(
      {
        header: 'Get Domains',
        message: `Getting the domains on the Fusebit platform...`,
        errorHeader: 'Domain Error',
      },
      () => domainData.listAll()
    );
    return result as IOpsDomain[];
  }

  public async listDomains(options?: IListOpsDomainOptions): Promise<IListOpsDomainResult> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const domainData = opsDataContext.domainData;

    const messages =
      options && options.next
        ? {}
        : {
            header: 'Get Domains',
            message: `Getting the domains on the Fusebit platform...`,
            errorHeader: 'Domain Error',
          };

    const result = await this.executeService.execute(messages, () => domainData.list(options));
    return result as IListOpsDomainResult;
  }

  public async confirmListMore(): Promise<boolean> {
    const confirmPrompt = await Confirm.create({ header: 'Get More Domains?' });
    return confirmPrompt.prompt(this.input.io);
  }

  public async displayDomains(domains: IOpsDomain[]) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(domains, null, 2));
      return;
    }

    if (domains.length == 0) {
      await this.executeService.warning('No Domains', 'There are no domains on the Fusebit platform');
      return;
    }

    await this.executeService.message(Text.cyan('Domain Name'), Text.cyan('Details'));
    for (const domain of domains) {
      this.writeDomains(domain);
    }
  }

  public async displayDomain(domain: IOpsDomain) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(domain, null, 2));
      return;
    }

    await this.executeService.message(Text.cyan('Domain Name'), Text.cyan('Details'));
    this.writeDomains(domain);
  }

  private async writeDomains(domain: IOpsDomain) {
    const details = [Text.dim('Account: '), domain.accountName, Text.eol()];

    const nameServers = domain.nameServers;
    details.push(Text.dim('Name Servers: '));
    details.push(nameServers && nameServers.length ? nameServers.join(' ') : '<none>');

    await this.executeService.message(Text.bold(domain.domainName), Text.create(details));
  }
}
