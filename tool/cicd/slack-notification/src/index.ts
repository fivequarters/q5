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
    return;
  }
  const failurePayload = {
    text: ':warning: Tests are failing :warning:',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:warning: :warning: :warning: ${outputJson.numFailedTestSuites} test suites have failed. :warning: :warning: :warning:`,
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
        text: `${test.name.split('/var/lib/jenkins/workspace/fusebit-test-suite/api/function-api/test/v1/')[1]} Failed`,
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
