import { join } from 'path';
import JsonFile from './JsonFile';

function getWorkspacePaths(contents: any) {
  const compilerOptions = contents.compilerOptions || {};
  const paths = compilerOptions.paths || {};
  return paths;
}

export default class RootTsconfig extends JsonFile {
  constructor(path: string) {
    super(path);
  }

  public async GetWorkspacePaths(): Promise<any> {
    await super.Load();
    const workspacePaths = getWorkspacePaths(this.contents);
    const paths: any = {};
    for (const path of Object.keys(workspacePaths)) {
      const singlePath = workspacePaths[path][0];
      if (singlePath) {
        paths[path] = singlePath;
      }
    }
    return paths;
  }

  public async SetWorkspacePath(name: string, workspacePath: string) {
    await super.Load();
    const workspacePaths = getWorkspacePaths(this.contents);
    workspacePaths[name] = [join(workspacePath, 'src')];
    this.contents.compilerOptions = this.contents.compilerOptions || {};
    this.contents.compilerOptions.paths = workspacePaths;
    await super.Save();
  }

  public async RemoveWorkspacePath(name: string) {
    await super.Load();
    const workspacePaths = getWorkspacePaths(this.contents);
    workspacePaths[name] = undefined;
    await super.Save();
  }

  public async UpdateWorkspacePath(name: string, newName: string, workspacePath?: string) {
    await super.Load();
    const workspacePaths = getWorkspacePaths(this.contents);
    if (workspacePaths[name]) {
      workspacePath = workspacePath ? join(workspacePath, 'src') : workspacePath;
      workspacePath = workspacePath || workspacePaths[name][0];
      workspacePaths[name] = undefined;
      workspacePaths[newName] = [workspacePath];
      this.contents.compilerOptions.paths = workspacePaths;
      await super.Save();
    }
  }
}
