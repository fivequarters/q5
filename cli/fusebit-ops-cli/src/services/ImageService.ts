import { IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';

// ------------------
// Internal Functions
// ------------------

function getDateString(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateOnly = new Date(date.valueOf());
  dateOnly.setHours(0, 0, 0, 0);

  const dateOnlyMs = dateOnly.valueOf();
  const [dateString, timeString] = date.toLocaleString().split(',');
  return dateOnlyMs === today.valueOf() ? timeString.trim() : dateString.trim();
}

function getSizeString(size: number) {
  const inMB = size / (1000 * 1000);
  return inMB.toFixed(2);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsImage {
  repository: string;
  tag: string;
  size: number;
  updatedAt: Date;
}

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

  public async pullImage(tag: string): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const imageData = opsDataContext.imageData;

    await this.executeService.execute(
      {
        header: 'Pull Image',
        message: `Pulling the fusebit-mono image with tag '${Text.bold(tag)}'`,
        errorHeader: 'Pull Error',
      },
      () => imageData.pull(tag)
    );

    await this.executeService.result(
      'Image Pulled',
      `The fusebit-mono image with tag '${Text.bold(tag)}' was successfully pulled`
    );
  }

  public async publishImage(tag: string): Promise<void> {
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

  public async listImages(): Promise<IOpsImage[]> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const imageData = opsDataContext.imageData;

    const images = await this.executeService.execute(
      {
        header: 'List Images',
        message: `Listing the available Fusebit Platform images`,
        errorHeader: 'List Error',
      },
      () => imageData.list()
    );

    return images || [];
  }

  public async displayImages(images: IOpsImage[]) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(images, null, 2));
      return;
    }

    if (images.length == 0) {
      await this.executeService.warning('No Images', 'There are no available images on the Fusebit platform');
      return;
    }

    images.sort((imageA, imageB) => imageA.updatedAt.getTime() - imageB.updatedAt.getTime());

    await this.executeService.message(Text.cyan('Image'), Text.cyan('Details'));
    for (const image of images) {
      this.writeImage(image);
    }
  }

  private async writeImage(image: IOpsImage) {
    const details = [
      Text.dim('Last Updated: '),
      getDateString(image.updatedAt),
      Text.eol(),
      Text.dim('Size (MB): '),
      getSizeString(image.size),
    ];

    await this.executeService.message(Text.bold(image.tag), Text.create(details));
  }
}
