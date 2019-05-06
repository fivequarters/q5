import { IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';

// ----------------
// Exported Classes
// ----------------

export class ImageService {
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
    return new ImageService(input, opsService, executeService);
  }

  public async publish(tag: string): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const imageData = opsDataContext.imageData;

    await this.executeService.execute(
      {
        header: 'Publish Image',
        message: `Publishing the fusebit-mono image with tag '${Text.bold(tag)}'`,
        errorHeader: 'Publish Error',
      },
      () => imageData.publish(tag)
    );

    await this.executeService.result(
      'Image Published',
      `The fusebit-mono image with tag '${Text.bold(tag)}' was successfully published`
    );
  }

  public async deploy(deploymentName: string, tag: string): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const imageData = opsDataContext.imageData;

    await this.executeService.execute(
      {
        header: 'Deploying Instance',
        message: `Deploying an instance of the fusebit-mono image with tag '${Text.bold(tag)}' to '${Text.bold(
          deploymentName
        )}'`,
        errorHeader: 'Publish Error',
      },
      () => imageData.deploy(deploymentName, tag)
    );

    await this.executeService.result(
      'Image Deployed',
      `An instance of fusebit-mono image with tag '${Text.bold(tag)}' was successfully deployed to '${Text.bold(
        deploymentName
      )}'`
    );
  }
}
