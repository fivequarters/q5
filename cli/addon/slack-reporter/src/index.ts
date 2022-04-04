import fs from 'fs';
import os from 'os';
import open from 'open';
import superagent from 'superagent';
import crypto from 'crypto';
import path from 'path';

const dotPath = '.fusebit-ops';
const pluginFolderName = 'plugins';
const slackPluginFile = 'slack.json';

export interface IReporterConfiguration {
  integrationBaseUrl: string;
}

let commandId;

const setup = async (slackReporterConfig: IReporterConfiguration) => {
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
  if (!fs.existsSync(path.join('~/', dotPath, pluginFolderName))) {
    fs.mkdirSync(path.join('~/', dotPath, pluginFolderName));
  }

  fs.writeFileSync(
    path.join('~/', dotPath, pluginFolderName, slackPluginFile),
    JSON.stringify({
      tenantId,
      integrationBaseUrl: slackReporterConfig.integrationBaseUrl,
    })
  );
};

const getConfig = async () => {
  return fs.readFileSync(path.join('~/', dotPath, pluginFolderName, slackPluginFile), 'utf-8');
};

const startExecution = async () => {};

const writeMessage = async () => {};

const endExecution = async () => {};
