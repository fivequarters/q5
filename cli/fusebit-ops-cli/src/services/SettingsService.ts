import { IExecuteInput } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { FusebitOpsCore } from '@5qtrs/fusebit-ops-core';

// ----------------
// Exported Classes
// ----------------

export class SettingsService {
  private core: FusebitOpsCore;
  private executeService: ExecuteService;

  private constructor(core: FusebitOpsCore, executeService: ExecuteService) {
    this.core = core;
    this.executeService = executeService;
  }

  public static async create(core: FusebitOpsCore, input: IExecuteInput) {
    const executeService = await ExecuteService.create(core, input);
    return new SettingsService(core, executeService);
  }

  public async getUser() {
    return this.executeService.execute(
      {
        errorHeader: 'Settings Error',
        errorMessage: 'An error was encountered when reading the CLI setting for the user name.',
      },
      async () => {
        const settings = await this.core.getSettings();
        return settings.awsUserName;
      }
    );
  }
}
