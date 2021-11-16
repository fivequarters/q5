import { homedir } from 'os';
import { join } from 'path';
import { readFile, writeFile, removeFile, removeDirectory, readDirectory } from '@5qtrs/file';

export class DotConfig {
  protected nameProp: string;
  protected directory: string;

  constructor(name: string, directory?: string) {
    this.nameProp = name;
    this.directory = directory || homedir();
  }

  public get name() {
    return this.nameProp;
  }

  public get path() {
    return join(this.directory, this.nameProp);
  }

  protected async readBinary(path: string): Promise<Buffer> {
    const fullPath = join(this.path, path);
    const contents = await readFile(fullPath);
    return contents instanceof Buffer ? contents : Buffer.alloc(0);
  }

  protected async writeBinary(path: string, contents: Buffer, options: { mode?: number } = {}) {
    const fullPath = join(this.path, path);
    return writeFile(fullPath, contents, { ensurePath: true, ...options });
  }

  protected async removeFile(path: string) {
    const fullPath = join(this.path, path);
    return removeFile(fullPath);
  }

  protected async removeDirectory(path: string) {
    let fullPath = join(this.path, path);
    while (fullPath !== this.path) {
      await removeDirectory(fullPath);
      fullPath = join(fullPath, '..');
      const remamining = await readDirectory(fullPath);
      if (remamining.length) {
        return;
      }
    }
  }

  protected async readJson(path: string): Promise<any> {
    const fullPath = join(this.path, path);
    const json = (await readFile(fullPath)).toString();
    if (!json) {
      return {};
    }

    let contents;
    try {
      contents = JSON.parse(json);
    } catch (error) {
      throw new Error(`Error parsing '${fullPath}'; ${error}`);
    }

    return contents;
  }

  protected async writeJson(path: string, contents: any): Promise<void> {
    const fullPath = join(this.path, path);
    const newJson = JSON.stringify(contents, null, 2);
    return await writeFile(fullPath, newJson);
  }
}
