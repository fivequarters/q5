import { Project } from '@5qtrs/workspace';
import { Writable } from 'stream';
import ICommand from './ICommand';

const unknown = '<unknown>';

export default class PackageCommand implements ICommand {
  get Name() {
    return 'package';
  }

  get Description() {
    return 'Packages a new workspace and all local dependencies';
  }

  get Usage() {
    return 'package <name> ';
  }

  public async Handler(args: string[], project: Project, output: Writable) {
    const name = args.shift() || unknown;

    let workspace;
    try {
      workspace = await project.GetWorkspace(name);
    } catch (error) {
      throw new Error(`Failed to get the workspace '${name}'. ${error.message}`);
    }

    if (!workspace) {
      throw new Error(`No such workspace '${name}'.`);
    }

    try {
      await workspace.Package();
    } catch (error) {
      throw new Error(`Failed to package the workspace '${name}'. ${error.message}`);
    }

    output.write(`\nWorkspace '${name}' has been packaged`);
  }
}
