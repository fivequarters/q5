import JsonFile from './JsonFile';

function addWorkspacePath(workspacePaths: string[] = [], path: string): string[] {
  const result = updateWorkspacePath(workspacePaths, path);
  result.push(path);
  return result;
}

function updateWorkspacePath(workspacePaths: string[], path: string, newPath?: string): string[] {
  const result = [];
  const pathNormalized = path.toLowerCase();
  for (const workspacePath of workspacePaths) {
    const workspacePathNormalized = workspacePath.toLowerCase();
    if (workspacePathNormalized !== pathNormalized) {
      result.push(workspacePath);
    } else if (newPath) {
      result.push(newPath);
    }
  }
  return result;
}

export default class RootPackageJson extends JsonFile {
  constructor(path: string) {
    super(path);
  }

  public async GetWorkspaces(): Promise<string[]> {
    await super.Load();
    try {
      return this.contents.workspaces.packages;
    } catch (e) {
      return this.contents.workspaces;
    }
  }

  public async SetWorkspaces(paths: string[]): Promise<void> {
    try {
      this.contents.workspaces.packages = paths;
    } catch (e) {
      this.contents.workspaces = paths;
    }
    await super.Save();
  }

  public async GetOrg(): Promise<string> {
    await super.Load();
    return this.contents.org || '';
  }

  public async HasWorkspacesProperty(): Promise<boolean> {
    const workspaces = await this.GetWorkspaces();
    return workspaces !== null && workspaces !== undefined;
  }

  public async GetWorkspacePaths(): Promise<string[]> {
    return [...((await this.GetWorkspaces()) || [])];
  }

  public async AddWorkspacePath(path: string): Promise<void> {
    let workspaces = await this.GetWorkspaces();
    workspaces = addWorkspacePath(workspaces, path);
    await this.SetWorkspaces(workspaces);
  }

  public async RemoveWorkspacePath(path: string): Promise<void> {
    let workspaces = await this.GetWorkspaces();
    workspaces = updateWorkspacePath(workspaces, path);
    await this.SetWorkspaces(workspaces);
  }

  public async UpdateWorkspacePath(currentPath: string, newPath: string): Promise<void> {
    let workspaces = await this.GetWorkspaces();
    workspaces = updateWorkspacePath(this.contents.workspaces, currentPath, newPath);
    await this.SetWorkspaces(workspaces);
  }

  public async GetDevDependencies(): Promise<any> {
    await super.Load();
    const dependencies: any = {};
    for (const name of Object.keys(this.contents.devDependencies || {})) {
      dependencies[name] = this.contents.devDependencies[name];
    }
    return dependencies;
  }

  public async SetDevDependency(name: string, version: string): Promise<void> {
    await super.Load();
    const dependencies = this.contents.devDependencies || {};
    dependencies[name] = version;
    this.contents.devDependencies = dependencies;
    await super.Save();
  }

  public async RemoveDevDependency(name: string): Promise<void> {
    await super.Load();
    const dependencies = this.contents.devDependencies || {};
    dependencies[name] = undefined;
    await super.Save();
  }
}
