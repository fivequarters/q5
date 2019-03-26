import { homedir } from 'os';
import { join } from 'path';
import { readFile, writeFile } from '@5qtrs/file';

export class DotConfig {
  protected nameProp: string;

  constructor(name: string) {
    this.nameProp = name;
  }

  public get name() {
    return this.nameProp;
  }

  public get path() {
    return join(homedir(), this.name.indexOf('.') === 0 ? this.name : `.${this.name}`);
  }

  protected async readBinary(path: string): Promise<Buffer> {
    const fullPath = join(this.path, path);
    const contents = await readFile(fullPath);
    return contents instanceof Buffer ? contents : Buffer.alloc(0);
  }

  protected async writeBinary(path: string, contents: Buffer) {
    const fullPath = join(this.path, path);
    return writeFile(fullPath, contents);
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
    return writeFile(fullPath, newJson);
  }
}
