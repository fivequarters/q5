import { IExecuteInput } from '@5qtrs/cli';
import { FusebitOpsCore, IFusebitOpsDeployment, IFusebitOpsPublishDetails } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';
import { ExecuteService } from './ExecuteService';

// ----------------
// Exported Classes
// ----------------

export class ApiSetupService {
  private core: FusebitOpsCore;
  private input: IExecuteInput;
  private executeService: ExecuteService;

  private constructor(core: FusebitOpsCore, input: IExecuteInput, executeService: ExecuteService) {
    this.core = core;
    this.input = input;
    this.executeService = executeService;
  }

  public static async create(core: FusebitOpsCore, input: IExecuteInput) {
    const executeService = await ExecuteService.create(core, input);
    return new ApiSetupService(core, input, executeService);
  }

  public async setupApi(deployment: IFusebitOpsDeployment, publishDetails: IFusebitOpsPublishDetails) {
    return this.executeService.execute(
      {
        header: 'Setting up Api',
        message: Text.create("Setting up the '", Text.bold(publishDetails.api), "' api..."),
        errorHeader: 'Build Error',
        errorMessage: Text.create("An error was encountered setting up the '", Text.bold(publishDetails.api), "' api."),
      },
      async () => {
        await this.core.setupApi(deployment, publishDetails);
        return true;
      }
    );
  }
}
