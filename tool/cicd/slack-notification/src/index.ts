#!/usr/bin/env node

import superagent from 'superagent';
import { JestOutput, Status } from './jestTypes';
import { promises as fs } from 'fs';
const outputJson: JestOutput = require('../../../../api/function-api/testOutput.json');

// Using 2 variables despite being the same URL because eventually we want to publish to engineering on a test failure.
const failureWebhook = 'https://hooks.slack.com/services/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';
const successWebhook = 'https://hooks.slack.com/services/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';

const nameToMention = [
  { name: 'Matthew Zhao', id: '<@U01UDTF3VQR>' },
  { name: 'Benn Bollay', id: '<@UUPT2SQN7>' },
  { name: 'Ruben Restrepo', id: '<@U0277EMBRSN>' },
  { name: 'Bruno Krebs', id: '<@U027X5JG8QG>' },
  { name: 'Tomasz Janczuk', id: '<@UFN96HN1J>' },
  { name: 'Yavor Georgiev', id: '<@UDGRLGJTG>' },
  { name: 'Chris More', id: '<@U01NQDVLYKB>' },
  { name: 'Shehzad Akbar', id: '<@U02CP37DEU8>' },
  { name: 'Jacob Haller-Roby', id: '<@U01NQDVRW0Z>' },
  { name: 'Liz Parody', id: '<@U02EJPA1MCJ>' },
];

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
        text: `${test.name.split('/var/lib/jenkins/workspace/fusebit-test-suite/api/function-api/test/')[1]} Failed`,
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

  const runId = await fs.readFile('/tmp/rp-results-id');
  failurePayload.blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `Check the testbot data here https://testbot.dev.fusebit.io/ui/#q5-fusebit/launches/all/${runId}`,
    },
  });

  const commit = await fs.readFile('/var/lib/jenkins/workspace/fusebit-test-suite/commit.txt', 'utf8');
  const commiters = commit.split('\n');
  for (const commiter of commiters) {
    for (const person of nameToMention) {
      if (commiter.includes(person.name)) {
        failurePayload.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${person.id} is one of the last commiters.`,
          },
        });
      }
    }
  }

  try {
    await superagent.post(failureWebhook).send(failurePayload);
  } catch (e) {
    console.log(e);
  }
})();
