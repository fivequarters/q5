import { Project } from '@5qtrs/workspace';
import { spawn } from '@5qtrs/child-process';
import { join, sep } from 'path';
import { Writable } from 'stream';
import ICommand from './ICommand';

const unknown = '<unknown>';
const startPort = 8000;
const defaultTemplateType = 'default';
const webAppTemplateType = 'webApp';
const pathMap: { [index: string]: string } = {
  'app/web': webAppTemplateType,
};

async function getNextFreePort(project: Project) {
  let ports = [];
  try {
    const workspaces = await project.GetWorkspaces();
    for (const workspace of workspaces) {
      const port = await workspace.GetDevServerPort();
      ports.push(port);
    }
  } catch (error) {
    throw new Error(`Failed to collect the workspace dev server ports. ${error.message}`);
  }

  let nextFreePort = startPort;
  if (ports.length) {
    while (ports.find(port => port === nextFreePort)) {
      nextFreePort++;
    }
  }
  return nextFreePort;
}

export default class NewCommand implements ICommand {
  get Name() {
    return 'new';
  }

  get Description() {
    return 'Creates a new workspace';
  }

  get Usage() {
    return 'new <{path/}name>';
  }

  public async Handler(args: string[], project: Project, output: Writable) {
    const nameAndPath = args.shift() || unknown;

    if (nameAndPath === unknown) {
      throw new Error(`The name '${nameAndPath}' is invalid.`);
    }

    let name = '';
    let path = '';
    const index = nameAndPath.indexOf('@');
    if (index !== -1) {
      path = nameAndPath.substring(0, index);
      name = nameAndPath.substring(index);
    } else {
      const segments = nameAndPath.split(sep);
      name = segments.pop() || unknown;
      path = segments.length ? join(...segments) : '';
    }

    let templateType = defaultTemplateType;
    for (const pathPrefix in pathMap) {
      if (path.indexOf(pathPrefix) === 0) {
        templateType = pathMap[pathPrefix];
      }
    }

    let workspace;
    try {
      workspace = await project.NewWorkspace(name, path, templateType);
    } catch (error) {
      throw new Error(`Failed to create new workspace '${name}' at location '${path}'.`);
    }

    if (workspace) {
      if (templateType === webAppTemplateType) {
        const port = await getNextFreePort(project);
        workspace.SetDevServerPort(port);
      }

      const cwd = await workspace.GetFullPath();
      const args = ['install'];
      const result = await spawn('yarn', { cwd, args, stdout: output });

      if (result.code) {
        throw new Error(`Failed execute install with new workspace '${name}`);
      }
    }

    output.write(`\nNew workspace '${name}' created at location '${path}'\n\n`);
  }
}
