import { EOL } from 'os';
import { join, relative } from 'path';
import { Zip } from '@5qtrs/zip';
import { readDirectory, readFile } from '@5qtrs/file';
import { Project } from '@5qtrs/workspace';
import { TextCaptureStream } from '@5qtrs/stream';

// ------------------
// Internal Functions
// ------------------

function filterWorkspaceCommandOutput(output: string) {
  const lines = output.split(EOL);
  const filtered = lines.filter(line => line.startsWith('  '));
  return filtered.join(EOL);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IWorkspaceDistFiles {
  [index: string]: string | Buffer;
}

// ----------------
// Exported Classes
// ----------------

export class OpsWorkspace {
  private project: Project;
  private constructor(project: Project) {
    this.project = project;
  }

  public static async create() {
    const project = await Project.FromDiscoveredRootPath();
    return new OpsWorkspace(project);
  }

  public async build(workspaceName: string) {
    return this.executeYarn(workspaceName, ['build']);
  }

  public async bundle(workspaceName: string) {
    return this.executeYarn(workspaceName, ['bundle']);
  }

  public async getDistFiles(workspaceName: string) {
    const workspace = await this.getWorkspace(workspaceName);
    const path = await workspace.GetFullPath();
    const distPath = join(path, 'dist');

    const options = { joinPaths: true, recursive: true, filesOnly: true };
    const filePaths = await readDirectory(distPath, options);
    const distFiles: IWorkspaceDistFiles = {};
    for (const filePath of filePaths) {
      const data = await readFile(filePath);
      const relativePath = relative(distPath, filePath);
      distFiles[relativePath] = data;
    }

    return distFiles;
  }

  private async getWorkspace(workspaceName: string) {
    let workspace;
    try {
      workspace = await this.project.GetWorkspace(workspaceName);
    } catch (error) {
      throw new Error(`Failed to get the workspace '${workspaceName}'. ${error.message}`);
    }

    if (!workspace) {
      throw new Error(`No such workspace '${workspaceName}'.`);
    }

    return workspace;
  }

  private async executeYarn(workspaceName: string, args: string[]) {
    const workspace = await this.getWorkspace(workspaceName);

    const stdout = new TextCaptureStream();
    const options = { isScript: true, args, stdout };
    const exitCode = await workspace.Execute('yarn', options);
    const output = filterWorkspaceCommandOutput(stdout.toString());
    if (exitCode != 0) {
      const message = `Executing the command resulted in a error with the following output: ${EOL}${output}`;
      throw new Error(message);
    }
    return output;
  }
}
