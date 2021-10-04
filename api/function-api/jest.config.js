const { jest } = require('@5qtrs/tool-config');
let reportportal;
try {
  reportportal = require('./reportportal.json');
} catch (e) {}

const execSync = require('child_process').execSync;
const gitBranchName = execSync(`git rev-parse --abbrev-ref HEAD`).toString();

module.exports = {
  ...jest,
  setupFilesAfterEnv: ['./test/jest.setup.ts'],
  ...(reportportal
    ? {
        reporters: [
          [
            '@reportportal/agent-js-jest',
            {
	      mode: "DEBUG",
	      debug: true,
              token: reportportal.token,
              endpoint: reportportal.endpoint,
              project: reportportal.project,
              launch: reportportal.launch,
              description: 'function-api executions',
              suiteNameTemplate: '{filename}',
              usePathForSuiteName: true,
              attributes: [
                {
                  key: 'function-api/version',
                  value: `${require('../../package.json').version}`,
                },
                {
                  key: 'branch',
                  value: gitBranchName,
                },
              ],
            },
          ],
        ],
      }
    : {}),
};
