import { batch } from '@5qtrs/batch';
import { spawn } from '@5qtrs/child-process';
import { copyDirectory, exists, isFile, replaceInFile } from '@5qtrs/file';
import { MergeStream } from '@5qtrs/stream';
import { cpus } from 'os';
import { join, relative } from 'path';
import { Readable, Writable } from 'stream';
import RootPackageJson from './RootPackageJson';
import RootTsconfig from './RootTsconfig';
import Workspace from './Workspace';
import WorkspaceInfo from './WorkspaceInfo';

const assetsPath = join(__dirname, '..', 'assets');
const numberOfCores = cpus().length;

function getTemplatePath(type: string = 'default'): string {
  return join(assetsPath, `${type}Template`);
}

async function getWorkspaceData(rootPath: string): Promise<any> {
  let cmdOutput = null;
  const workspaceData = null;

  try {
    const output = await spawn('yarn', { cwd: rootPath, args: ['workspaces', 'info', '--json'] });
    cmdOutput = output.stdout.toString();
  } catch (error) {
    throw new Error(`Error executing yarn workspaces cmd: '${error}'`);
  }

  try {
    const cmdParsed = JSON.parse(cmdOutput);
    if ('data' in cmdParsed) {
      // Yarn 1.21 uses a string-encoded JSON under 'data'
      return JSON.parse(cmdParsed.data);
    }
    // Yarn 1.22 doesn't.
    return cmdParsed;
  } catch (error) {
    throw new Error(`Error parsing yarn workspaces output: '${error}'`);
  }
}

async function isRootPath(path: string): Promise<boolean> {
  try {
    const packageJsonPath = join(path, 'package.json');
    if (await isFile(packageJsonPath)) {
      const rootPackageJson = new RootPackageJson(packageJsonPath);
      return rootPackageJson.HasWorkspacesProperty();
    }
  } catch (error) {
    // do nothing
  }
  return false;
}

export default class Project {
  get RootPath(): string {
    return this.rootPath;
  }

  get DependencyVersionMatchPrefix(): string {
    return this.dependencyVersionMatchPrefix;
  }

  set DependencyVersionMatchPrefix(value: string) {
    this.dependencyVersionMatchPrefix = value;
  }

  public static async FromDiscoveredRootPath(): Promise<Project> {
    let path = __dirname;
    while (true) {
      if (await isRootPath(path)) {
        return Project.FromRootPath(path);
      }
      const parent = join(path, '..');
      if (parent === path) {
        throw new Error('Unable to discover the project root path');
      }
      path = parent;
    }
  }

  public static async FromRootPath(rootPath: string): Promise<Project> {
    const rootTsconfig = new RootTsconfig(join(rootPath, 'tsconfig.json'));
    const rootPackageJson = new RootPackageJson(join(rootPath, 'package.json'));
    const project = new Project(rootPath, rootTsconfig, rootPackageJson);

    const workspaceData = await getWorkspaceData(rootPath);
    const workspaces: Workspace[] = [];
    await Promise.all(
      Object.keys(workspaceData || {}).map(async name => {
        const workspace = await Workspace.FromLocation(project, workspaceData[name].location);
        workspaces.push(workspace);
      })
    );

    project.workspaces = workspaces;

    return project;
  }

  private rootPath: string;
  private rootTsconfig: RootTsconfig;
  private rootPackageJson: RootPackageJson;
  private workspaces: Workspace[] = [];
  private dependencyVersionMatchPrefix = '^';

  private constructor(rootPath: string, rootTsconfig: RootTsconfig, rootPackageJson: RootPackageJson) {
    this.rootPath = rootPath;
    this.rootTsconfig = rootTsconfig;
    this.rootPackageJson = rootPackageJson;
  }

  public async GetOrg(): Promise<string> {
    return this.rootPackageJson.GetOrg();
  }

  public async GetWorkspaces(): Promise<Workspace[]> {
    return this.workspaces;
  }

  public async GetWorkspace(name: string): Promise<Workspace | undefined> {
    const org = await this.GetOrg();
    const info = WorkspaceInfo.Create(org, name);
    const workspaces = await this.GetWorkspaces();
    for (const workspace of workspaces) {
      const workspaceName = await workspace.GetName();
      if (workspaceName === info.FullName) {
        return workspace;
      }
    }

    return undefined;
  }

  public async RenameWorkspace(workspace: Workspace, newName: string): Promise<void> {
    const org = await this.GetOrg();
    const info = WorkspaceInfo.Create(org, newName);
    const workspacePaths = await this.rootTsconfig.GetWorkspacePaths();
    if (!workspacePaths[info.FullName]) {
      const fullName = await workspace.GetName();
      await this.rootTsconfig.UpdateWorkspacePath(fullName, info.FullName);
      await workspace.Rename(info.FullName);
    }
  }

  public async NewWorkspace(name: string, location: string, type?: string): Promise<Workspace> {
    const org = await this.GetOrg();
    const info = WorkspaceInfo.Create(org, name, location);
    const templatePath = getTemplatePath(type);
    const destinationPath = join(this.rootPath, info.Location);

    await copyDirectory(templatePath, destinationPath, { recursive: true, errorIfExists: true });

    const relativePathCurrent = relative(templatePath, this.rootPath);
    const relativePathNew = relative(destinationPath, this.rootPath);
    const replacements = [{ search: relativePathCurrent, replace: relativePathNew }];
    await replaceInFile(join(destinationPath, 'tsconfig.json'), replacements);
    await replaceInFile(join(destinationPath, 'jest.config.js'), replacements);
    await replaceInFile(join(destinationPath, 'prettier.config.js'), replacements);
    await replaceInFile(join(destinationPath, 'tslint.json'), replacements);

    await this.rootPackageJson.AddWorkspacePath(info.Location);
    await this.rootTsconfig.SetWorkspacePath(info.FullName, info.Location);

    const newWorkspace = await Workspace.FromLocation(this, info.Location);
    await newWorkspace.Rename(info.FullName);
    this.workspaces.push(newWorkspace);
    return newWorkspace;
  }

  public async DeleteWorkspace(name: string): Promise<void> {
    const org = await this.rootPackageJson.GetOrg();
    const info = WorkspaceInfo.Create(org, name);
    const workspace = await this.RemoveWorkspace(info.FullName);
    if (workspace) {
      const location = await workspace.GetLocation();
      await workspace.Delete();
      await this.rootPackageJson.RemoveWorkspacePath(location);
      await this.rootTsconfig.RemoveWorkspacePath(info.FullName);
    }
  }

  public async MoveWorkspace(workspace: Workspace, newLocation: string): Promise<void> {
    const fullName = await workspace.GetName();
    const info = WorkspaceInfo.Create('', fullName, newLocation);
    const workspacePaths = await this.rootTsconfig.GetWorkspacePaths();

    if (workspacePaths[fullName] && workspacePaths[fullName] !== join(info.Location, 'src')) {
      const rootPath = this.RootPath;
      const newWorkspacePath = join(rootPath, info.Location);
      const alreadyExists = await exists(newWorkspacePath);
      if (alreadyExists) {
        throw new Error(`Directory already exists: ${newWorkspacePath}`);
      }

      const location = await workspace.GetLocation();
      await this.rootPackageJson.UpdateWorkspacePath(location, info.Location);
      await this.rootTsconfig.SetWorkspacePath(fullName, info.Location);
      await workspace.Move(info.Location);
    }
  }

  public async Execute(
    cmd: string,
    options: {
      args?: string[];
      filter?: string;
      isScript?: boolean;
      stdin?: Readable;
      stdout?: Writable;
      stderr?: Writable;
    } = {}
  ): Promise<number> {
    const workspaces = await this.GetWorkspaces();
    const stderrToStdout = options.stdout && options.stderr === options.stdout;
    const stdout = options.stdout ? new MergeStream(options.stdout) : undefined;
    const stderr = options.stderr && !stderrToStdout ? new MergeStream(options.stderr) : undefined;

    const perWorkspace = async (workspace: Workspace) => {
      if (options.filter) {
        const location = await workspace.GetLocation();
        if (location.toLowerCase().indexOf(options.filter.toLowerCase()) === -1) {
          return 0;
        }
      }

      const stdoutSourceStream = stdout ? stdout.createSourceStream() : undefined;
      const stderrSourceStream = stderr ? stderr.createSourceStream() : undefined;

      const executeOptions = {
        args: options.args,
        isScript: options.isScript,
        stderr: stderrToStdout ? stdoutSourceStream : stderrSourceStream,
        stdin: options.stdin,
        stdout: stdoutSourceStream,
      };

      const exitCode = await workspace.Execute(cmd, executeOptions);

      if (stdoutSourceStream) {
        stdoutSourceStream.end();
      }

      if (stderrSourceStream) {
        stderrSourceStream.end();
      }

      return exitCode;
    };

    const batched = batch(numberOfCores, workspaces);
    const exitCodes: number[] = [];
    for (const batchItem of batched) {
      const batchExitCodes = await Promise.all(batchItem.map(perWorkspace));
      exitCodes.push(...batchExitCodes);
    }

    let finalCode: number = 0;
    if (options.stdout) {
      let isFirst = true;
      for (let i = 0; i < exitCodes.length; i++) {
        if (exitCodes[i]) {
          if (isFirst) {
            options.stdout.write('\n');
            isFirst = false;
          }
          const name = await workspaces[i].GetName();
          const exitCode = exitCodes[i];
          const message = [
            `\n\u001b[33mWarning:\u001b[39m Workspace '${name}'`,
            `command executed with exit code: ${exitCode}\n`,
          ].join(' ');
          options.stdout.write(message);

          finalCode = exitCode;
        }
      }
      if (!isFirst) {
        options.stdout.write('\n');
      }
    }

    return finalCode;
  }

  private async RemoveWorkspace(name: string) {
    let workspaceToRemove;
    const remainingWorkspaces = [];
    const nameLowercase = name.toLowerCase();
    const workspaces = await this.GetWorkspaces();
    for (const workspace of workspaces) {
      const workspaceName = await workspace.GetName();
      if (workspaceName.toLowerCase() === nameLowercase) {
        workspaceToRemove = workspace;
      } else {
        remainingWorkspaces.push(workspace);
      }
    }

    this.workspaces = remainingWorkspaces;
    return workspaceToRemove;
  }
}
