#!/usr/bin/env node

import superagent from 'superagent';
import { JestOutput, Status } from './jestTypes';
const outputJson: JestOutput = require('../../../../api/function-api/testOutput.json');

const failureWebhook = 'https://hooks.slack.com/services/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';
const successWebhook = 'https://hooks.slack.com/services/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';

(async () => {
  if (outputJson.success) {
    await superagent.post(successWebhook).send({
      text: ':tada: Fusebit Test Suite Passed :tada:',
    });
  }
  const failurePayload = {
    text: ':alarm: Tests are failing :alarm:',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `OOF ${outputJson.numFailedTestSuites} Suites have failed.`,
        },
      },
    ],
  };
  for (const test of outputJson.testResults) {
    if (test.status !== Status.Failed) {
      continue;
    }

    failurePayload.blocks.push({
      type: 'section',
      text: {
        type: 'plain_text',
        text: `${test.name} Failed`,
      },
    });
  }
  failurePayload.blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `Check the logs here ${process.env.BUILD_URL}`,
    },
  });
  try {
    await superagent.post(successWebhook).send(failurePayload);
  } catch (e) {
    console.log(e);
  }
})();
