import { IExecuteInput } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { OpsService } from './OpsService';
import * as SlackCliPlugin from '@5qtrs/cli-addon-slack-reporter';
import fs from 'fs';
import path from 'path';
import os from 'os';

const dotFolderPath = '.fusebit-ops';
const dotFileName = 'plugin.json';

export class PluginService {
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);

    return new PluginService(opsSvc, execSvc, input);
  }

  constructor(private opsService: OpsService, private executeService: ExecuteService, private input: IExecuteInput) {}

  private getPluginPath() {
    return path.join(os.userInfo().homedir, dotFolderPath, dotFileName);
  }

  public async addPlugin(pluginName: string, config: any) {
    const pluginPath = this.getPluginPath();
    let current = JSON.parse(
      fs.existsSync(pluginPath) ? fs.readFileSync(pluginPath, { encoding: 'utf-8' }) : '{}'
    ) as any;
    current[pluginName] = config;
    fs.writeFileSync(pluginPath, JSON.stringify(current));
  }

  public async installSlackPlugin(config: any) {
    const configPath = this.getPluginPath();
    const fullConfig = await SlackCliPlugin.setup({ integrationBaseUrl: config.integrationBaseUrl });
    await this.addPlugin('slack', fullConfig);
    await this.input.io.writeLine('Slack plugin enabled successfully.');
  }
}
