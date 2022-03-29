import fs from 'fs';
import os from 'os';
import open from 'open';
import superagent from 'superagent';
import crypto from 'crypto';

export interface ISlackReporterConfiguration {
  token: string;
  url: string;
  configPath: string;
  baseUrl: string;
}

export interface IStartExecution {
  user?: string;
  command: string;
}

export interface IStopExecution {
  commandId: string;
  statusCode: number;
}

export class SlackReporterAddon {
  constructor(private slackReporterConfig: ISlackReporterConfiguration) {}
  public async isSetup(): Promise<boolean> {
    const tenants = await this.getTenantsFromIntegration();
    return tenants.length > 0;
  }

  public async setup() {
    const tenantId = await this.getTenantId();
    open(`${this.slackReporterConfig.baseUrl}/api/service/start?tenantId=${tenantId}`);
    let installSuccess = false;
    do {
      const installs = await this.getTenantsFromIntegration();
      installSuccess = installs.length > 0;
    } while (!installSuccess);
  }

  private async getTenantId() {
    const hostname = os.hostname();
    const username = os.userInfo().username;
    return crypto
      .createHash('sha256')
      .update(username + '@' + hostname)
      .digest('base64');
  }

  private async getTenantsFromIntegration(): Promise<any[]> {
    const tenantId = await this.getTenantId();
    const result = await superagent
      .get(`${this.slackReporterConfig.baseUrl}/install/?fusebit.tenantId=${tenantId}`)
      .set('Authorization', `Bearer ${this.slackReporterConfig.token}`);
    return result.body.items;
  }

  public async startExecution(input: IStartExecution): Promise<string> {
    input.user = input.user ? input.user : os.userInfo().username;
    const tenantId = await this.getTenantId();
    const result = await superagent
      .post(`${this.slackReporterConfig.baseUrl}/api/tenant/${tenantId}/startCommand`)
      .send({
        ...input,
      });
    return result.body.commandId as string;
  }

  public async stopExecution(input: IStopExecution): Promise<void> {
    const result = await superagent.post(`${this.slackReporterConfig.baseUrl}/api/${input.commandId}/stopCommand`);
  }
}
