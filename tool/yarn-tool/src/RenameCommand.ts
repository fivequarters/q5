import { Project } from '@5qtrs/workspace';
import { SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION } from 'constants';
import { Writable } from 'stream';
import ICommand from './ICommand';

const unknown = '<unknown>';

export default class RenameCommand implements ICommand {
  get Name() {
    return 'rename';
  }

  get Description() {
    return 'Renames a workspace';
  }

  get Usage() {
    return 'rename <name> <new-name>';
  }

  public async Handler(args: string[], project: Project, output: Writable) {
    const name = args.shift() || unknown;
    const newName = args.shift() || unknown;

    if (newName === unknown) {
      throw new Error(`The new name '${newName}' is invalid.`);
    }

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
      await workspace.Rename(newName);
    } catch (error) {
      throw new Error(`Failed to rename the workspace '${name}' to '${newName}'. ${error.message}`);
    }

    output.write(`\nWorkspace '${name}' renamed to '${newName}'\n\n`);
  }
}
