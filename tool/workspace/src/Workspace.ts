import { spawn } from '@5qtrs/child-process';
import {
  moveDirectory,
  readDirectory,
  removeDirectory,
  copyDirectory,
  readFile,
  writeFile,
  copyFile,
  isDirectory,
} from '@5qtrs/file';
import { IndentTextStream } from '@5qtrs/stream';
import { join, relative } from 'path';
import { Readable, Writable } from 'stream';
import PackageJson from './PackageJson';
import Project from './Project';
import Tsconfig from './Tsconfig';
import WorkspaceInfo from './WorkspaceInfo';

const antiCircularLoopStack: string[] = [];

export default class Workspace {
  public static async FromLocation(project: Project, location: string) {
    const workspaces = await project.GetWorkspaces();
    for (const existingWorkspace of workspaces) {
      const workspaceLocation = await existingWorkspace.GetLocation();
      if (workspaceLocation === location) {
        return existingWorkspace;
      }
    }

    const tsconfig = new Tsconfig(join(project.RootPath, location, 'tsconfig.json'));
    const packageJson = new PackageJson(join(project.RootPath, location, 'package.json'));
    const workspace = new Workspace(project, location, tsconfig, packageJson);

    return workspace;
  }
  private project: Project;
  private location: string;
  private tsconfig: Tsconfig;
  private packageJson: PackageJson;

  private constructor(project: Project, location: string, tsconfig: Tsconfig, packageJson: PackageJson) {
    this.project = project;
    this.location = location;
    this.tsconfig = tsconfig;
    this.packageJson = packageJson;
  }

  public async GetName(): Promise<string> {
    return this.packageJson.GetName();
  }

  public async GetVersion(): Promise<string> {
    return this.packageJson.GetVersion();
  }

  public async GetLocation(): Promise<string> {
    return this.location;
  }

  public async GetFullPath(): Promise<string> {
    return join(this.project.RootPath, this.location);
  }

  public async GetDevServerPort(): Promise<number> {
    return this.packageJson.GetDevServerPort();
  }

  public async SetDevServerPort(port: number): Promise<void> {
    return this.packageJson.SetDevServerPort(port);
  }

  public async GetDependencies(): Promise<any> {
    return this.packageJson.GetDependencies();
  }

  public async GetAllDescendantDependencies(): Promise<any> {
    const childrenDependencies = await this.GetDependencies();
    const allDependencies: { [index: string]: string } = {};

    const name = await this.GetName();
    if (antiCircularLoopStack.includes(name)) {
      throw new Error(`Circular dependencies discovered: ${antiCircularLoopStack.join(' -> ')} -> ${name}`);
    }
    antiCircularLoopStack.push(name);

    for (const child of Object.keys(childrenDependencies)) {
      allDependencies[child] = childrenDependencies[child];
      const workspace = await this.project.GetWorkspace(child);
      if (workspace) {
        const descendants = await workspace.GetAllDescendantDependencies();
        for (const descendant of Object.keys(descendants)) {
          allDependencies[descendant] = descendants[descendant];
        }
      }
    }

    if (antiCircularLoopStack.pop() !== name) {
      throw new Error('Failed to keep antiCircularLoopStack a stack; aborting.');
    }
    return allDependencies;
  }

  public async GetWorkspaceDependencies(): Promise<any> {
    const workspaces = await this.project.GetWorkspaces();
    const dependencies = await this.GetDependencies();
    const workspaceDependencies: any = {};
    await Promise.all(
      workspaces.map(async (workspace) => {
        const workspaceName = await workspace.GetName();
        if (dependencies[workspaceName]) {
          workspaceDependencies[workspaceName] = dependencies[workspaceName];
        }
      })
    );

    return workspaceDependencies;
  }

  public async Rename(newName: string): Promise<void> {
    const org = await this.project.GetOrg();
    const info = WorkspaceInfo.Create(org, newName);
    await this.project.RenameWorkspace(this, info.FullName);
    const fullName = await this.GetName();
    if (fullName !== info.FullName) {
      await this.packageJson.Rename(info.FullName);
      const workspaces = await this.project.GetWorkspaces();
      await Promise.all(workspaces.map((workspace) => workspace.packageJson.UpdateDependency(fullName, info.FullName)));

      const location = await this.GetLocation();
      const newLocation = join(location, '..', info.Name);
      await this.Move(newLocation);
    }
  }

  public async AddDependency(fullName: string, version?: string, isDev: boolean = false): Promise<void> {
    const workspace = await this.project.GetWorkspace(fullName);
    if (workspace) {
      const path = await workspace.GetLocation();
      const location = await this.GetLocation();
      const rootPath = this.project.RootPath;
      const relativePath = relative(join(rootPath, location), join(rootPath, path));
      await this.tsconfig.AddWorkspaceReference(relativePath);
      if (!version) {
        version = await workspace.GetVersion();
      }
    }
    if (version) {
      const dependencyMatchVersion = this.project.DependencyVersionMatchPrefix;
      await this.packageJson.SetDependency(fullName, dependencyMatchVersion + version, isDev);
    } else {
      const message = `A version parameter is required for non-workspace dependency '${fullName}'`;
      throw new Error(message);
    }
  }

  public async Package() {
    const org = await this.project.GetOrg();
    const location = await this.GetLocation();
    const packagePath = join(location, 'package');
    const libcPath = join(location, 'libc');
    const sourcePath = join(packagePath, 'libc');
    await removeDirectory(packagePath, { recursive: true });
    await copyDirectory(libcPath, sourcePath, { ensurePath: true, recursive: true });

    const packageJsonPath = join(location, 'package.json');
    let packageJson;
    try {
      const contents = await readFile(packageJsonPath);
      packageJson = JSON.parse(contents.toString());
    } catch (error) {
      throw new Error(`Error reading '${packageJsonPath}'; File not found`);
    }

    const dependencies = await this.GetAllDescendantDependencies();
    const npmModules: { [index: string]: string } = {};
    const bundledDependencies: string[] = [];
    for (const dependencyName in dependencies) {
      if (dependencyName.startsWith(`@${org}/`) || packageJson.bundledDependencies?.includes(dependencyName)) {
        const dependency = await this.project.GetWorkspace(dependencyName);
        bundledDependencies.push(dependencyName);
        if (dependency) {
          const dependencyPath = await dependency.GetFullPath();
          const dependencyLibc = join(dependencyPath, 'libc');
          const nodeModules = join(packagePath, 'node_modules', dependencyName);
          await copyDirectory(dependencyLibc, nodeModules, { ensurePath: true, recursive: true });
          const packageJsonDependencyPath = join(dependencyPath, 'package.json');
          let packageJsonDependency;
          try {
            packageJsonDependency = require(packageJsonDependencyPath);
          } catch (error) {
            throw new Error(`Error reading '${packageJsonDependencyPath}'; File not found`);
          }
          if (packageJsonDependency.main) {
            packageJsonDependency.main = packageJsonDependency.main.replace('libc/', '');
          }
          await writeFile(`${nodeModules}/package.json`, JSON.stringify(packageJsonDependency, null, 2));
        } else {
          const dest = join(packagePath, 'node_modules', dependencyName);
          let source = join(location, 'node_modules', dependencyName);

          // Check to see if the package has a specific version; if not, use the project directory.
          if (!(await isDirectory(source))) {
            source = join(this.project.RootPath, 'node_modules', dependencyName);
          }
          await copyDirectory(source, dest, { ensurePath: true, recursive: true });
        }
      } else if (!dependencyName.startsWith(`@types/`)) {
        npmModules[dependencyName] = dependencies[dependencyName];
      }
    }

    packageJson.dependencies = npmModules;
    packageJson.bundledDependencies = bundledDependencies;
    packageJson.devDependencies = undefined;
    packageJson.scripts = undefined;
    packageJson.name = packageJson.packageAs || packageJson.name.replace(`@${org}/`, '');
    if (packageJson.packageAssets) {
      for (const packageAsset of packageJson.packageAssets) {
        const assetFromPath = join(location, packageAsset);
        const assetToPath = join(packagePath, packageAsset);
        if (await isDirectory(assetFromPath)) {
          await copyDirectory(assetFromPath, assetToPath);
        } else {
          await copyFile(assetFromPath, assetToPath);
        }
      }
      packageJson.packageAssets = undefined;
    }

    const newPackageJsonPath = join(packagePath, 'package.json');
    await writeFile(newPackageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  public async RemoveDependency(fullName: string): Promise<void> {
    const workspace = await this.project.GetWorkspace(fullName);
    if (workspace) {
      const path = await workspace.GetLocation();
      const location = await this.GetLocation();
      const rootPath = this.project.RootPath;
      const relativePath = relative(join(rootPath, location), join(rootPath, path));
      await this.tsconfig.RemoveWorkspaceReference(relativePath);
    }
    await this.packageJson.RemoveDependency(fullName);
  }

  public async IncrementPatchVersion(): Promise<void> {
    await this.packageJson.IncrementPatchVersion();
    await this.UpdateDependencyVersion();
  }

  public async IncrementMinorVersion(): Promise<void> {
    await this.packageJson.IncrementMinorVersion();
    await this.UpdateDependencyVersion();
  }

  public async IncrementMajorVersion(): Promise<void> {
    await this.packageJson.IncrementMajorVersion();
    await this.UpdateDependencyVersion();
  }

  public async Delete(): Promise<void> {
    const name = await this.GetName();
    await this.project.DeleteWorkspace(name);
    const rootPath = this.project.RootPath;
    const location = await this.GetLocation();
    const workspacePath = join(rootPath, location);
    await removeDirectory(workspacePath);
    await this.RemoveEmptyDirectories(workspacePath);
  }

  public async Move(newLocation: string): Promise<void> {
    const fullName = await this.GetName();
    const info = WorkspaceInfo.Create('', fullName, newLocation);
    await this.project.MoveWorkspace(this, info.Location);
    const location = await this.GetLocation();
    if (info.Location !== location) {
      const rootPath = this.project.RootPath;

      const workspacePath = join(rootPath, location);
      const newWorkspacePath = join(rootPath, info.Location);

      await moveDirectory(workspacePath, newWorkspacePath, { errorIfExists: true });
      await this.RemoveEmptyDirectories(workspacePath);
      this.tsconfig = new Tsconfig(join(newWorkspacePath, 'tsconfig.json'));
      this.packageJson = new PackageJson(join(newWorkspacePath, 'package.json'));
      this.location = info.Location;

      const newPathToRoot = relative(newWorkspacePath, rootPath);
      await this.tsconfig.UpdateExtendsPath(join(newPathToRoot, 'tsconfig.json'));
      await this.UpdateOwnWorkspaceReferences(workspacePath, newWorkspacePath);
      await this.UpdateOtherWorkspaceReferences(workspacePath, newWorkspacePath);
    }
  }

  public async Execute(
    cmd: string,
    options: {
      args?: string[];
      isScript?: boolean;
      stdin?: Readable;
      stdout?: Writable;
      stderr?: Writable;
    } = {}
  ): Promise<number> {
    const cmdString = [cmd, ...(options.args || [])].join(' ');
    const stderrToStdout = options.stdout && options.stderr === options.stdout;

    if (options.isScript && options.args && options.args[0]) {
      const script = options.args ? options.args[0] : null;
      if (script) {
        const hasScript = await this.packageJson.HasScript(script);
        if (!hasScript) {
          return 0;
        }
      }
    }

    if (options.stdout) {
      const name = await this.GetName();
      options.stdout.write(`\n\u001b[34mWorkspace:\u001b[39m ${name}`);
      options.stdout.write(`\n\u001b[34mCommand:\u001b[39m   ${cmdString}\n\n`);
    }

    let stdout;
    if (options.stdout) {
      const indented = new IndentTextStream(2);
      indented.pipe(options.stdout);
      stdout = indented;
    }

    let stderr;
    if (options.stderr && !stderrToStdout) {
      const indented = new IndentTextStream(2);
      indented.pipe(options.stderr);
      stderr = indented;
    }

    const rootPath = this.project.RootPath;
    const location = await this.GetLocation();
    const spawnOptions = {
      args: options.args || undefined,
      cwd: join(rootPath, location),
      stdin: options.stdin || undefined,
      stdout,
      stderr: stderrToStdout ? stdout : stderr,
    };

    const result = await spawn(cmd, spawnOptions);

    if (options.stdout) {
      options.stdout.write('\n');
    }

    return result.code || 0;
  }

  private async UpdateDependencyVersion(): Promise<void> {
    const name = await this.GetName();
    const version = await this.GetVersion();
    const workspaces = await this.project.GetWorkspaces();
    const dependencyMatchVersion = this.project.DependencyVersionMatchPrefix;
    for (const workspace of workspaces) {
      await workspace.packageJson.UpdateDependency(name, name, dependencyMatchVersion + version);
    }
  }

  private async UpdateOtherWorkspaceReferences(workspacePath: string, newWorkspacePath: string): Promise<void> {
    const rootPath = this.project.RootPath;
    const workspaces = await this.project.GetWorkspaces();
    try {
      await Promise.all(
        workspaces.map(async (workspace) => {
          const path = await workspace.GetLocation();
          const relativePath = relative(join(rootPath, path), workspacePath);
          const newRelativePath = relative(join(rootPath, path), newWorkspacePath);
          return workspace.tsconfig.UpdateWorkspaceReference(relativePath, newRelativePath);
        })
      );
    } catch (error) {
      const message = [
        'One or more workspace references may not have been updated due to',
        `the following failure: ${error.message}`,
      ].join(' ');
      throw new Error(message);
    }
  }

  private async UpdateOwnWorkspaceReferences(workspacePath: string, newWorkspacePath: string): Promise<void> {
    const relativePaths = await this.tsconfig.GetWorkspaceReferences();
    for (const relativePath of relativePaths) {
      const path = join(workspacePath, relativePath);
      const newRelativePath = relative(newWorkspacePath, path);
      await this.tsconfig.UpdateWorkspaceReference(relativePath, newRelativePath);
    }
  }

  private async RemoveEmptyDirectories(workspacePath: string): Promise<void> {
    let parentDirectory = join(workspacePath, '..');
    let itemsInDirectory = await readDirectory(parentDirectory);
    while (itemsInDirectory.length === 0) {
      await removeDirectory(parentDirectory);
      parentDirectory = join(parentDirectory, '..');
      itemsInDirectory = await readDirectory(parentDirectory);
    }
  }
}
