import { IExecuteInput } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { join } from 'path';
import { Text } from '@5qtrs/text';
import { readFile } from '@5qtrs/file';

// ------------------
// Internal Constants
// ------------------

const notSet = Text.dim(Text.italic('<not set>'));

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
  private executeService: ExecuteService;

  private constructor(executeService: ExecuteService) {
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    return new VersionService(executeService);
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
      this.executeService.error('Version Error', 'Unable to read the version of the current Fusebit CLI installation');
      throw error;
    }
    return version;
  }
}
