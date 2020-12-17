import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { IOpsAccount, IListOpsAccountOptions, IListOpsAccountResult } from '@5qtrs/ops-data';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';

// ----------------
// Exported Classes
// ----------------

export class AccountService {
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
    return new AccountService(input, opsService, executeService);
  }

  public async checkAccountExists(account: IOpsAccount): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const accountData = opsDataContext.accountData;

    const exists = await this.executeService.execute(
      {
        header: 'Account Check',
        message: `Determining if the '${Text.bold(account.name)}' account already exists...`,
        errorHeader: 'Account Error',
      },
      () => accountData.exists(account)
    );

    if (exists) {
      this.executeService.warning('Account Exists', `There is already an '${Text.bold(account.name)}' account`);
      throw new Error('Account already Exists');
    }
  }

  public async confirmAddAccount(account: IOpsAccount) {
    const confirmPrompt = await Confirm.create({
      header: 'Add the account to the Fusebit platform?',
      details: [
        { name: 'Account Name', value: account.name },
        { name: 'Aws Account', value: account.id },
        { name: 'Aws Role', value: account.role },
      ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Add Canceled',
        Text.create('Adding the AWS account to the Fusebit platform was canceled')
      );
      throw new Error('Add Canceled');
    }
  }

  public async addAccount(account: IOpsAccount): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const accountData = opsDataContext.accountData;

    await this.executeService.execute(
      {
        header: 'Add Account',
        message: `Adding the '${Text.bold(account.name)}' AWS account to the Fusebit platform...`,
        errorHeader: 'Account Error',
      },
      () => accountData.add(account)
    );

    this.executeService.result(
      'Account Added',
      `The '${Text.bold(account.name)}' AWS account was successfully added to Fusebit platform`
    );
  }

  public async listAllAccounts(): Promise<IOpsAccount[]> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const accountData = opsDataContext.accountData;

    const result = await this.executeService.execute(
      {
        header: 'Get Accounts',
        message: `Getting the accounts on the Fusebit platform...`,
        errorHeader: 'Account Error',
      },
      () => accountData.listAll()
    );
    return result as IOpsAccount[];
  }

  public async listAccounts(options?: IListOpsAccountOptions): Promise<IListOpsAccountResult> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const accountData = opsDataContext.accountData;

    const messages =
      options && options.next
        ? {}
        : {
            header: 'Get Accounts',
            message: `Getting the accounts on the Fusebit platform...`,
            errorHeader: 'Account Error',
          };

    const result = await this.executeService.execute(messages, () => accountData.list(options));
    return result as IListOpsAccountResult;
  }

  public async confirmListMore(): Promise<boolean> {
    const confirmPrompt = await Confirm.create({ header: 'Get More Accounts?' });
    return confirmPrompt.prompt(this.input.io);
  }

  public async displayAccounts(accounts: IOpsAccount[]) {
    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify(accounts, null, 2));
      return;
    }

    if (accounts.length == 0) {
      await this.executeService.warning('No Accounts', 'There are no AWS accounts on the Fusebit platform');
      return;
    }

    await this.executeService.message(Text.cyan('Account Name'), Text.cyan('Details'));
    for (const account of accounts) {
      this.writeAccount(account);
    }
  }

  private async writeAccount(account: IOpsAccount) {
    const details = [Text.dim('AWS Account Id: '), account.id, Text.eol()];

    details.push(Text.dim('AWS Role: '));
    details.push(account.role || '<none>');

    await this.executeService.message(Text.bold(account.name), Text.create(details));
  }
}
