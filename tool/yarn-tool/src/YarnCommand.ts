import { Project } from '@5qtrs/workspace';
import { Writable } from 'stream';
import ICommand from './ICommand';

export default class YarnCommand implements ICommand {
  get Name() {
    return 'yarn';
  }

  get Description() {
    return 'Executes a yarn script for each workspace in the project';
  }

  get Usage() {
    return 'yarn <script> {filter} {...script-args}';
  }

  public async Handler(args: string[], project: Project, output: Writable) {
    let filter = '';
    if (args.length >= 2) {
      filter = args[1];
      args.splice(1, 1);
    }

    const options = {
      args,
      filter,
      stdout: output,
      stderr: output,
      isScript: true,
    };
    return project.Execute('yarn', options);
  }
}
