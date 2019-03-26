import { IExecuteInput } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { FlexdOpsCore } from '@5qtrs/flexd-ops-core';

// ----------------
// Exported Classes
// ----------------

export class SettingsService {
  private core: FlexdOpsCore;
  private executeService: ExecuteService;

  private constructor(core: FlexdOpsCore, executeService: ExecuteService) {
    this.core = core;
    this.executeService = executeService;
  }

  public static async create(core: FlexdOpsCore, input: IExecuteInput) {
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
