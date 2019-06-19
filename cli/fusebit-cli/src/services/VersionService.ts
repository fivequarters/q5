import { IExecuteInput, MessageKind, Message } from '@5qtrs/cli';
import { join } from 'path';
import { readFile } from '@5qtrs/file';

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitPublicKey {
  keyId: string;
  publicKey: string;
}

export interface INewFusebitIssuer {
  displayName?: string;
  jsonKeyUri?: string;
  publicKeyPath?: string;
  publicKeyId?: string;
}

export interface IFusebitIssuer {
  id: string;
  displayName?: string;
  jsonKeyUri?: string;
  publicKeys?: IFusebitPublicKey[];
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
      const path = join(__dirname, '..', '..', 'package.json');
      const buffer = await readFile(path);
      const content = buffer.toString();
      const json = JSON.parse(content);
      version = json.version;
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
