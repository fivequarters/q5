import { spawn } from '@5qtrs/child-process';
import { Project } from '@5qtrs/workspace';
import { join, sep } from 'path';
import { Writable } from 'stream';
import ICommand from './ICommand';

const unknown = '<unknown>';

enum TemplateType {
  default = 'default',
  sharedLib = 'sharedLib',
  serverLib = 'serverLib',
  clientLib = 'clientLib',
  webApp = 'webApp',
  webComp = 'webComp',
  api = 'api',
  demo = 'demo',
}

const startPorts: { [index: string]: number } = {
  api: 7000,
  app: 8000,
  webComp: 9000,
  sharedLib: 9500,
  serverLib: 9500,
  clientLib: 9500,
  site: 9900,
  demo: 4000,
};

const pathToTemplateMap: { [index: string]: TemplateType } = {
  'app/web': TemplateType.webApp,
  'lib/shared': TemplateType.sharedLib,
  'lib/server': TemplateType.serverLib,
  'lib/client': TemplateType.clientLib,
  'lib/runtime': TemplateType.serverLib,
  api: TemplateType.api,
  comp: TemplateType.webComp,
  demo: TemplateType.demo,
};

async function getNextFreePort(project: Project, startPort: number) {
  const ports = [];
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

    let templateType = TemplateType.sharedLib;
    for (const pathPrefix in pathToTemplateMap) {
      if (path.indexOf(pathPrefix) === 0) {
        templateType = pathToTemplateMap[pathPrefix];
      }
    }

    if (templateType === TemplateType.demo) {
      const newPath = join(path, name);
      const appName = `${name}-app`;
      const apiName = `${name}-api`;
      await this.CreateWorkspace(appName, newPath, TemplateType.webApp, startPorts.demo, project, output);
      await this.CreateWorkspace(apiName, newPath, TemplateType.api, startPorts.demo, project, output);
      return;
    }

    const startPort = startPorts[templateType] || 0;
    await this.CreateWorkspace(name, path, templateType, startPort, project, output);
  }

  private async CreateWorkspace(
    name: string,
    path: string,
    templateType: TemplateType,
    startPort: number,
    project: Project,
    output: Writable
  ) {
    let workspace;
    try {
      workspace = await project.NewWorkspace(name, path, templateType);
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to create new workspace '${name}' at location '${path}' (${templateType})`);
    }

    if (workspace) {
      if (startPort) {
        const port = await getNextFreePort(project, startPort);
        workspace.SetDevServerPort(port);
      }

      if (templateType === TemplateType.api) {
        const org = await project.GetOrg();
        await workspace.AddDependency(`@${org}/request`, '', true);
        await workspace.AddDependency(`@${org}/server`);
        await workspace.AddDependency(`@${org}/config`);
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
