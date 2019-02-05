import { Project } from '@5qtrs/workspace';
import { Writable } from 'stream';
import ICommand from './ICommand';

export default class IncrementCommand implements ICommand {
  get Name() {
    return 'increment';
  }

  get Description() {
    return 'Increments the major, minor or patch version of a workspace package';
  }

  get Usage() {
    return 'increment <name> {--major} {--minor}';
  }

  public async Handler(args: string[], project: Project, output: Writable) {
    const name = args.shift() || '<unknown>';
    let major = false;
    let minor = false;
    for (const arg of args) {
      if (arg === '--major') {
        major = true;
      }
      if (arg === '--minor') {
        minor = true;
      }
    }

    let workspace;
    try {
      workspace = await project.GetWorkspace(name);
    } catch (error) {
      throw new Error(`Failed to get the workspace '${name}'. ${error.message}`);
    }

    if (!workspace) {
      throw new Error(`No such workspace'${name}'.`);
    }

    try {
      if (major) {
        await workspace.IncrementMajorVersion();
      } else if (minor) {
        await workspace.IncrementMinorVersion();
      } else {
        await workspace.IncrementPatchVersion();
      }
    } catch (error) {
      throw new Error(`Failed to increment the version of the workspace '${name}' package. ${error.message}`);
    }

    output.write(`\nWorkspace '${name}' package version has been incremented`);
  }
}
