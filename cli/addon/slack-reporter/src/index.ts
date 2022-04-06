import fs from 'fs';
import os from 'os';
import open from 'open';
import superagent from 'superagent';
import crypto from 'crypto';
import path from 'path';

const dotFolderPath = '.fusebit-ops';
const dotFileName = 'plugin.json';
export interface IReporterConfiguration {
  integrationBaseUrl: string;
}

let executionId: string;

export const setup = async (slackReporterConfig: IReporterConfiguration) => {
  const start = await superagent
    .get(`${slackReporterConfig.integrationBaseUrl}/api/service/start`)
    .redirects(1)
    .ok((res) => res.statusCode < 400);

  const sessionId = start.redirects[0].split(slackReporterConfig.integrationBaseUrl)[1].split('/')[2];
  open(start.redirects[0]);
  let sessionResult;
  do {
    const result = await superagent.get(
      `${slackReporterConfig.integrationBaseUrl}/api/service/status/session/${sessionId}`
    );
    sessionResult = result.body;
  } while (!sessionResult.output);
  const tenantId = sessionResult.output.tags['fusebit.tenantId'];
  return {
    tenantId,
    integrationBaseUrl: slackReporterConfig.integrationBaseUrl,
  };
};

const getPluginPath = () => {
  return path.join(os.userInfo().homedir, dotFolderPath, dotFileName);
};

const getConfig = async () => {
  return JSON.parse(fs.readFileSync(getPluginPath(), 'utf-8')).slack;
};

export const isSetup = async () => {
  if (!fs.existsSync(getPluginPath())) {
    return false;
  }
  try {
    const config = JSON.parse(fs.readFileSync(getPluginPath(), 'utf-8'));
    if (config && config.slack) {
      return true;
    }
  } catch (_) {}

  return false;
};

export const startExecution = async (command: string) => {
  const config = await getConfig();
  const result = await superagent.post(`${config.integrationBaseUrl}/api/tenant/${config.tenantId}/start`).send({
    command,
  });

  executionId = result.body.executionId;
};

export const writeMessage = async (message: string) => {
  const config = await getConfig();
  await superagent.post(`${config.integrationBaseUrl}/api/execution/${executionId}/sendMessage`).send({
    message,
  });
};

export const endExecution = async (exitCode: string) => {
  const config = await getConfig();
  await superagent.post(`${config.integrationBaseUrl}/api/execution/${executionId}/end`).send({
    exitCode,
  });
};
