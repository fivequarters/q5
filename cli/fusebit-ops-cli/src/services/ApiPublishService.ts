import { IExecuteInput } from '@5qtrs/cli';
import { FusebitOpsCore } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';
import { ExecuteService } from './ExecuteService';

// ----------------
// Exported Classes
// ----------------

export class ApiPublishService {
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
    return new ApiPublishService(core, input, executeService);
  }

  public async publishApi(api: string, user: string, comment?: string) {
    const buildOk = await this.executeService.execute(
      {
        header: 'Building Api',
        message: Text.create("Building the local source code for the '", Text.bold(api), "' api..."),
        errorHeader: 'Build Error',
        errorMessage: Text.create(
          "An error was encountered building the local source code for the '",
          Text.bold(api),
          "' api..."
        ),
      },
      async () => {
        await this.core.buildApi(api);
        return true;
      }
    );

    if (!buildOk) {
      undefined;
    }

    const bundleOk = await this.executeService.execute(
      {
        header: 'Bundling Api',
        message: Text.create("Bundling the local source code for the '", Text.bold(api), "' api..."),
        errorHeader: 'Bundle Error',
        errorMessage: Text.create(
          "An error was encountered bundling the local source code for the '",
          Text.bold(api),
          "' api..."
        ),
      },
      async () => {
        await this.core.bundleApi(api);
        return true;
      }
    );

    if (!bundleOk) {
      return undefined;
    }

    const publishedApi = await this.executeService.execute(
      {
        header: 'Publishing Api',
        message: Text.create("Publishing the local source code for the '", Text.bold(api), "' api..."),
        errorHeader: 'Build Error',
        errorMessage: Text.create(
          "An error was encountered publishing the local source code for the '",
          Text.bold(api),
          "' api..."
        ),
      },
      async () => this.core.publishApi(api, user, comment)
    );

    if (!publishedApi) {
      return undefined;
    }

    return publishedApi;
  }
}
