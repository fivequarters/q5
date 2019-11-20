import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { OpsService } from './OpsService';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';
import { AccountService } from './AccountService';
import { IConfigSettings } from '@5qtrs/config';

// ------------------
// Internal Constants
// ------------------

const notSet = Text.dim(Text.italic('<not set>'));

// ----------------
// Exported Classes
// ----------------

export class SetupService {
  private input: IExecuteInput;
  private opsService: OpsService;
  private executeService: ExecuteService;
  private profileService: ProfileService;
  private accountService: AccountService;
  private settings: IConfigSettings;

  private constructor(
    input: IExecuteInput,
    opsService: OpsService,
    executeService: ExecuteService,
    profileService: ProfileService,
    accountService: AccountService
  ) {
    this.input = input;
    this.settings = {
      iamPermissionsBoundary: (this.input.options.iamPermissionsBoundary as string) || undefined,
    };
    this.opsService = opsService;
    this.executeService = executeService;
    this.profileService = profileService;
    this.accountService = accountService;
  }

  public static async create(input: IExecuteInput) {
    const opsService = await OpsService.create(input);
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    const accountService = await AccountService.create(input);
    return new SetupService(input, opsService, executeService, profileService, accountService);
  }

  public async isSetup(): Promise<boolean> {
    const opsDataContext = await this.opsService.getOpsDataContext(this.settings);

    const result = await this.executeService.execute(
      {
        header: 'Setup Check',
        message: 'Determining if the Fusebit platform is already setup...',
        errorHeader: 'Setup Error',
      },
      () => opsDataContext.isSetup()
    );

    return result as boolean;
  }

  public async setup(): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext(this.settings);
    await this.executeService.execute(
      {
        header: 'Setup',
        message: 'Setting up the Fusebit platform...',
        errorHeader: 'Setup Error',
      },
      () => opsDataContext.setup()
    );

    this.executeService.result('Setup', 'The Fusebit platform has been successfully setup');
  }

  public async alreadySetup(): Promise<void> {
    this.executeService.info('Setup', 'The Fusebit platform is already setup');
  }

  public async confirmSetup(): Promise<void> {
    const profile = await this.profileService.getProfileOrDefaultOrThrow();
    const confirmPrompt = await Confirm.create({
      header: 'Setup the Fusebit platform?',
      details: profile.credentialsProvider
        ? [
            { name: 'Main Account', value: profile.awsMainAccount },
            { name: 'Credentials Provider', value: profile.credentialsProvider },
            { name: 'IAM Permissions Boundary', value: (this.settings.iamPermissionsBoundary as string) || notSet },
          ]
        : [
            { name: 'Main Account', value: profile.awsMainAccount },
            { name: 'User Account', value: profile.awsUserAccount || notSet },
            { name: 'Main Role', value: profile.awsMainRole || notSet },
            { name: 'User Name', value: profile.awsUserName || notSet },
            { name: 'Access Key', value: profile.awsAccessKeyId || notSet },
            { name: 'IAM Permissions Boundary', value: (this.settings.iamPermissionsBoundary as string) || notSet },
          ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning('Setup Canceled', Text.create('Setting up the Fusebit platform was canceled'));
      throw new Error('Init Canceled');
    }
  }
}
