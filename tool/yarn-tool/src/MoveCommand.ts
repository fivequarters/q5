import { Project } from '@5qtrs/workspace';
import { Writable } from 'stream';
import ICommand from './ICommand';

const unknown = '<unknown>';

export default class MoveCommand implements ICommand {
  get Name() {
    return 'move';
  }

  get Description() {
    return 'Moves a new workspace to a new location';
  }

  get Usage() {
    return 'move <name> <new-path>';
  }

  public async Handler(args: string[], project: Project, output: Writable) {
    const name = args.shift() || unknown;
    const path = args.shift() || unknown;

    if (path === unknown) {
      throw new Error(`The path '${path}' is invalid.`);
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
      await workspace.Move(path);
    } catch (error) {
      throw new Error(`Failed to move the workspace '${name}' to '${path}'. ${error.message}`);
    }

    output.write(`\nWorkspace '${name}' has been moved to to '${path}'`);
  }
}
