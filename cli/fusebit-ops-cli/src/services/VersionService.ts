import { IExecuteInput, MessageKind, Message } from '@5qtrs/cli';
import { join } from 'path';
import { readFile } from '@5qtrs/file';

export async function getVersion() {
  return require('../../package.json').version;
}

// ----------------
// Exported Classes
// ----------------

export class VersionService {
  private input: IExecuteInput;

  private constructor(input: IExecuteInput) {
    this.input = input;
  }

  public static async create(input: IExecuteInput) {
    return new VersionService(input);
  }

  public async getVersion() {
    let version;
    try {
      version = getVersion();
    } catch (error) {
      if (!this.input.options.quiet) {
        const header = 'Version Error';
        const message = 'Unable to read the version of the current Fusebit CLI installation';
        const formattedMessage = await Message.create({ header, message, kind: MessageKind.error });
        await formattedMessage.write(this.input.io);
      }
      throw error;
    }
    return version;
  }
}
