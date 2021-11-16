import { join } from 'path';
import { readFileSync } from 'fs';

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
  private static version: string;

  public static getVersion() {
    if (VersionService.version) {
      return VersionService.version;
    }
    const path = join(__dirname, '..', '..', 'package.json');
    const content = readFileSync(path, { encoding: 'utf8' });
    const json = JSON.parse(content);
    return (VersionService.version = json.version);
  }
}
