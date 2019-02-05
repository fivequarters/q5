import { spawn } from '@5qtrs/child-process';
import { readFile, writeFile } from '@5qtrs/file';

export default class JsonFile {
  protected path: string;
  protected contents: any;

  constructor(path: string) {
    this.path = path;
    this.contents = {};
  }

  get Path() {
    return this.path;
  }

  protected async Load(): Promise<void> {
    let json = '';
    try {
      json = (await readFile(this.path, { errorIfNotExist: true })).toString();
    } catch (error) {
      throw new Error(`Error reading '${this.path}'; File not found`);
    }

    try {
      this.contents = JSON.parse(json);
    } catch (error) {
      throw new Error(`Error parsing '${this.path}'; ${error}`);
    }
  }

  protected async Save(): Promise<void> {
    const newJson = JSON.stringify(this.contents);
    await writeFile(this.path, newJson);

    // Run prettier so that the file is formatted correctly
    try {
      const cmd = `prettier --write ${this.path}`;
      await spawn('prettier', { args: ['--write', this.path] });
    } catch (error) {
      // do nothing
    }
  }
}
