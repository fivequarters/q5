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
  return path.join(os.userInfo().homedir, dotFolderPath, accountId);
}

function getPluginFilePath(accountId: string) {
  return path.join(getPluginPath(accountId), dotFileName);
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
    fs.mkdirSync(pluginPath, { recursive: true });
    const pluginFilePath = getPluginFilePath(awsAccountId);
    let current = JSON.parse(
      fs.existsSync(pluginFilePath) ? fs.readFileSync(pluginFilePath, { encoding: 'utf-8' }) : '{}'
    ) as any;
    current[pluginName] = config;
    fs.writeFileSync(pluginFilePath, JSON.stringify(current));
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

let executionId: string;

const messages: string[] = [];

export const isSetup = async (accountId?: string) => {
  if (!accountId) {
    return false;
  }
  if (!fs.existsSync(getPluginPath(accountId))) {
    return false;
  }
  try {
    const config = JSON.parse(fs.readFileSync(getPluginPath(accountId), 'utf-8'));
    if (config && config.slack) {
      return true;
    }
  } catch (_) {}

  return false;
};

const getConfig = (awsAccountId: string) => {
  return JSON.parse(fs.readFileSync(getPluginFilePath(awsAccountId), 'utf-8'));
};

export const startExecution = async (command: string, identity: any) => {
  const config = getConfig(identity.account);
  const result = await superagent.post(`${config.integrationBaseUrl}/api/tenant/${config.tenantId}/start`).send({
    command,
    ...identity,
  });
  executionId = result.body.executionId;
};

export const writeMessage = async (header: string, message: string) => {
  if (!executionId) {
    return;
  }
  messages.push(header + '\n' + message + '\n');
};

export const endExecution = async (exitCode: string) => {
  if (!executionId) {
    return;
  }
  const config = await getConfig('');
  await superagent.post(`${config.integrationBaseUrl}/api/execution/${executionId}/sendMessage`).send({
    messages,
  });
  await superagent.post(`${config.integrationBaseUrl}/api/execution/${executionId}/end`).send({
    exitCode,
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
    userId: identity.UserId as string,
  };
};
