import { Project } from '@5qtrs/workspace';
import { Writable } from 'stream';
import ICommand from './ICommand';

export default class PortsCommand implements ICommand {
  get Name() {
    return 'ports';
  }

  get Description() {
    return 'Lists the dev server ports assigned to each workspace';
  }

  get Usage() {
    return 'ports';
  }

  public async Handler(args: string[], project: Project, output: Writable) {
    const entries = [];
    try {
      const workspaces = await project.GetWorkspaces();
      for (const workspace of workspaces) {
        const name = await workspace.GetName();
        const port = await workspace.GetDevServerPort();
        entries.push({ name, port });
      }
    } catch (error) {
      throw new Error(`Failed to iterate the project workspaces. ${error.message}`);
    }

    for (const entry of entries) {
      if (entry.port > 0) {
        output.write(`\n\u001b[34mWorkspace:\u001b[39m ${entry.name} (\u001b[34mPort:\u001b[39m ${entry.port})`);
      }
    }
  }
}
