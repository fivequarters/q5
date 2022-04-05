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

let commandId;

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
  return fs.readFileSync(getPluginPath(), 'utf-8');
};

export const startExecution = async () => {};

export const writeMessage = async () => {};

export const endExecution = async () => {};
