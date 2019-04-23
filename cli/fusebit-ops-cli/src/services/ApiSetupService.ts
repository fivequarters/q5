import { IExecuteInput } from '@5qtrs/cli';
import { FlexdOpsCore, IFlexdOpsDeployment, IFlexdOpsPublishDetails } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';
import { ExecuteService } from './ExecuteService';

// ----------------
// Exported Classes
// ----------------

export class ApiSetupService {
  private core: FlexdOpsCore;
  private input: IExecuteInput;
  private executeService: ExecuteService;

  private constructor(core: FlexdOpsCore, input: IExecuteInput, executeService: ExecuteService) {
    this.core = core;
    this.input = input;
    this.executeService = executeService;
  }

  public static async create(core: FlexdOpsCore, input: IExecuteInput) {
    const executeService = await ExecuteService.create(core, input);
    return new ApiSetupService(core, input, executeService);
  }

  public async setupApi(deployment: IFlexdOpsDeployment, publishDetails: IFlexdOpsPublishDetails) {
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
