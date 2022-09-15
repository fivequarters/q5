import { IExecuteInput } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { OpsService } from './OpsService';
import fs from 'fs';
import path from 'path';
import os from 'os';
import AWS from 'aws-sdk';
import superagent from 'superagent';
import { IAwsConfig } from '@5qtrs/aws-config';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import open from 'open';

const dotFolderPath = '.fusebit-ops';
const dotFileName = 'plugin.json';

let globalAccountId: string | undefined;
let globalUserId: string;
let ts: string;
let globalIsSetup: boolean;

const setup = async (integrationBaseUrl: string) => {
  const start = await superagent
    .get(`${integrationBaseUrl}/api/service/start`)
    .redirects(1)
    .ok((res) => res.statusCode < 400);

  const sessionId = start.redirects[0].split(integrationBaseUrl)[1].split('/')[2];
  open(start.redirects[0]);
  let sessionResult;
  do {
    const result = await superagent.get(`${integrationBaseUrl}/api/service/status/session/${sessionId}`);
    sessionResult = result.body;
  } while (!sessionResult.output);
  const tenantId = sessionResult.output.tags['fusebit.tenantId'];
  return {
    tenantId,
    integrationBaseUrl: integrationBaseUrl,
  };
};
function getPluginPath(accountId: string) {
  return path.join(os.userInfo().homedir, dotFolderPath, accountId, dotFileName);
}
export class PluginService {
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    const opsDataContext = await opsSvc.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    return new PluginService(input, config, credentials);
  }

  constructor(private input: IExecuteInput, private config: IAwsConfig, private creds: IAwsCredentials) {}

  public async addPlugin(pluginName: string, awsAccountId: string, config: any) {
    const pluginPath = getPluginPath(awsAccountId);
    fs.mkdirSync(pluginPath.split('/').slice(0, -1).join('/'), { recursive: true });
    let current = JSON.parse(
      fs.existsSync(pluginPath) ? fs.readFileSync(pluginPath, { encoding: 'utf-8' }) : '{}'
    ) as any;
    current[pluginName] = config;
    fs.writeFileSync(pluginPath, JSON.stringify(current));
  }

  public async installSlackPlugin(config: any) {
    const fullConfig = await setup(config.integrationBaseUrl);
    const sts = new AWS.STS({
      ...this.creds,
    });
    const identity = await sts.getCallerIdentity().promise();
    await this.addPlugin('slack', identity.Account as string, fullConfig);
    await this.input.io.writeLine('Slack plugin enabled successfully.');
  }
}

const messages: string[] = [];

export const isSetup = async (accountId?: string) => {
  globalIsSetup = (() => {
    if (globalIsSetup) {
      return globalIsSetup;
    }

    globalAccountId = accountId;
    if (!globalAccountId) {
      return false;
    }
    if (!fs.existsSync(getPluginPath(globalAccountId))) {
      return false;
    }
    try {
      const config = JSON.parse(fs.readFileSync(getPluginPath(globalAccountId), 'utf-8'));
      if (config && config.slack) {
        return true;
      }
    } catch (_) {}

    return false;
  })();

  return globalIsSetup;
};

const getConfig = (awsAccountId: string) => {
  return JSON.parse(fs.readFileSync(getPluginPath(awsAccountId), 'utf-8'));
};

export const setAccountUserId = (userId: string) => {
  globalUserId = userId;
};

export const startExecution = async (command: string, identity: any) => {
  globalAccountId = identity.account;
  const config = getConfig(identity.account);
  const result = await superagent
    .post(`${config.slack.integrationBaseUrl}/api/tenant/${config.slack.tenantId}/start`)
    .send({
      command,
      ...identity,
      userId: globalUserId,
    });

  ts = result.body.ts;
};

export const writeMessage = async (header: string, message: string) => {
  messages.push(header + '\n' + message + '\n');
};

export const endExecution = async (exitCode: string) => {
  if (!globalAccountId) {
    return;
  }

  // Wait 3 seconds to let other calls of writeMessage finish first to prevent message being out of order.
  await new Promise((res) => setTimeout(res, 3000));

  const config = await getConfig(globalAccountId);
  await writeMessage('', 'Execution exited with code: ' + exitCode);
  await superagent
    .post(`${config.slack.integrationBaseUrl}/api/tenant/${config.slack.tenantId}/ts/${ts}/sendMessage`)
    .send({
      messages,
    });
};

export const getAwsIdentity = async (creds: any) => {
  const sts = new AWS.STS({
    ...creds,
  });

  const identity = await sts.getCallerIdentity().promise();

  return {
    arn: identity.Arn as string,
    account: identity.Account as string,
    userId: identity.Arn?.split('/').slice(-1)[0],
  };
};
