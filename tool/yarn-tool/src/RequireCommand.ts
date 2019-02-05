import path from 'path';
import { Project } from '@5qtrs/workspace';
import { spawn } from '@5qtrs/child-process';
import { Writable } from 'stream';
import ICommand from './ICommand';

export default class RequireCommand implements ICommand {
  get Name() {
    return 'require';
  }

  get Description() {
    return 'Adds a workspace dependency to a workspace';
  }

  get Usage() {
    return 'require <name> <dependency>';
  }

  public async Handler(args: string[], project: Project, output: Writable) {
    const name = args.shift() || '<unknown>';
    const dependency = args.shift() || '<unknown>';

    let workspace;
    try {
      workspace = await project.GetWorkspace(name);
    } catch (error) {
      throw new Error(`Failed to get the workspace '${name}'. ${error.message}`);
    }

    if (!workspace) {
      throw new Error(`No such workspace'${name}'.`);
    }

    let dependencyWorkspace;
    try {
      dependencyWorkspace = await project.GetWorkspace(dependency);
    } catch (error) {
      throw new Error(`Failed to get the workspace '${name}'. ${error.message}`);
    }

    if (!dependencyWorkspace) {
      output.write(`\nNo such workspace '${dependency}', executing 'yarn add ${dependency}'\n\n`);
      const cwd = await workspace.GetFullPath();
      const args = ['add', dependency];
      const result = await spawn('yarn', { cwd, args, stdout: output });

      if (result.code) {
        throw new Error(`Failed to add the module '${dependency}' to workspace '${name}`);
      }
    } else {
      try {
        const fullName = await dependencyWorkspace.GetName();
        await workspace.AddDependency(fullName);
      } catch (error) {
        throw new Error(`Failed to add the dependency on '${dependency}' to workspace '${name}. ${error.message}`);
      }
    }

    output.write(`\n\nAdded the dependency on '${dependency}' to workspace '${name}'\n\n`);
  }
}
