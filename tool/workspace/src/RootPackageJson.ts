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

  public async GetOrg(): Promise<string> {
    await super.Load();
    return this.contents.org || '';
  }

  public async HasWorkspacesProperty(): Promise<boolean> {
    await super.Load();
    const workspaces = this.contents.workspaces;
    return workspaces !== null && workspaces !== undefined;
  }

  public async GetWorkspacePaths(): Promise<string[]> {
    await super.Load();
    const contents = this.contents;
    return [...(contents.workspaces || [])];
  }

  public async AddWorkspacePath(path: string): Promise<void> {
    await super.Load();
    this.contents.workspaces = addWorkspacePath(this.contents.workspaces, path);
    await super.Save();
  }

  public async RemoveWorkspacePath(path: string): Promise<void> {
    await super.Load();
    if (this.contents.workspaces) {
      this.contents.workspaces = updateWorkspacePath(this.contents.workspaces, path);
      await super.Save();
    }
  }

  public async UpdateWorkspacePath(currentPath: string, newPath: string): Promise<void> {
    await super.Load();
    if (this.contents.workspaces) {
      this.contents.workspaces = updateWorkspacePath(this.contents.workspaces, currentPath, newPath);
      await super.Save();
    }
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
