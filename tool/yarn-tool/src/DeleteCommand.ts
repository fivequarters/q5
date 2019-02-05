import { Project } from '@5qtrs/workspace';
import { Writable } from 'stream';
import ICommand from './ICommand';

export default class DeleteCommand implements ICommand {
  get Name() {
    return 'delete';
  }

  get Description() {
    return 'Deletes a workspace';
  }

  get Usage() {
    return 'delete <name>';
  }

  public async Handler(args: string[], project: Project, output: Writable) {
    const name = args.shift() || '<unknown>';

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
      await workspace.Delete();
    } catch (error) {
      throw new Error(`Failed to delete the workspace '${name}'. ${error.message}`);
    }

    output.write(`\nWorkspace '${name}' has been deleted`);
  }
}
