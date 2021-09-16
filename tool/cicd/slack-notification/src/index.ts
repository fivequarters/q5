#!/usr/bin/env node

import superagent from 'superagent';
import { JestOutput, Status } from './jestTypes';
const outputJson: JestOutput = require('../../../../api/function-api/testOutput.json');

// Using 2 variables despite being the same URL because eventually we want to publish to engineering on a test failure.
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
    await superagent.post(failureWebhook).send(failurePayload);
  } catch (e) {
    console.log(e);
  }
})();
