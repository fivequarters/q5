#!/usr/bin/env node

import fs from 'fs';
import superagent from 'superagent';

import { JestOutput, Status } from './jestTypes';

interface ICommitEntry {
  name: string;
  hash: string;
  message: string;
}

const failureWebhook = process.env.FAILURE_WEBHOOK as string;
const successWebhook = process.env.SUCCESS_WEBHOOK as string;

const testPathPrefix = '/var/lib/jenkins/workspace/fusebit-test-suite/api/function-api/test/';
const commitTextFile = '/var/lib/jenkins/workspace/fusebit-test-suite/commit.txt';
const repositoryCommitUrl = 'https://github.com/fivequarters/q5/commit/';
const jestOutput: JestOutput = require('../../../../api/function-api/testOutput.json');

const nameToMention: Record<string, string> = {
  'Matthew Zhao': '<@U01UDTF3VQR>',
  'Benn Bollay': '<@UUPT2SQN7>',
  'Ruben Restrepo': '<@U0277EMBRSN>',
  'Bruno Krebs': '<@U027X5JG8QG>',
  'Tomasz Janczuk': '<@UFN96HN1J>',
  'Yavor Georgiev': '<@UDGRLGJTG>',
  'Chris More': '<@U01NQDVLYKB>',
  'Shehzad Akbar': '<@U02CP37DEU8>',
  'Jacob Haller-Roby': '<@U01NQDVRW0Z>',
  'Liz Parody': '<@U02EJPA1MCJ>',
};

const makeJenkinsUrl = (): string => `${process.env.BUILD_URL}/consoleText`;
const makeTestbotUrl = (testBotId: string) =>
  `https://testbot.dev.fusebit.io/ui/#q5-fusebit/launches/all/${testBotId}?item0Params=page.sort%3Dstatistics%2524executions%2524failed%252CDESC`;

const parseCommits = (): ICommitEntry[] => {
  const commitFile = fs.readFileSync(commitTextFile, 'utf8');
  const commits = commitFile.split('\n');
  return commits.map((commit) => {
    const commitSplit = commit.split(',');
    return {
      name: commitSplit[0],
      hash: commitSplit[1],
      message: commitSplit.slice(2).join(','),
    };
  });
};

const slackBlockHeader = {
  blocks: [
    {
      type: 'divider',
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Function API Test Failure',
        emoji: true,
      },
    },
  ],
};

const addErrorBlock = (block: any, failedTests: string[]) => {
  const section = {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: `*Failed: ${failedTests.length} tests*`,
      },
      {
        type: 'mrkdwn',
        text: failedTests[0],
      },
    ],
  };

  failedTests.slice(1).forEach((failedTest: string) => {
    section.fields.push(
      {
        type: 'plain_text',
        text: ' ',
      },
      {
        type: 'mrkdwn',
        text: failedTest,
      }
    );
  });

  block.blocks.push(section);
};

const addCommitterBlock = (block: any, commits: ICommitEntry[]) => {
  const section = {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: '*Last Committers*',
      },
      {
        type: 'plain_text',
        text: ' ',
      },
    ],
  };

  commits.forEach((commit) => {
    section.fields.push(
      {
        type: 'mrkdwn',
        text: `${nameToMention[commit.name] || commit.name}`,
      },
      {
        type: 'mrkdwn',
        text: `<${repositoryCommitUrl}${commit.hash}|${commit.hash}>: ${commit.message}`,
      }
    );
  });
  block.blocks.push(section);
};

const addFooter = (block: any, jenkinsUrl: string, testbotUrl: string) => {
  block.blocks.push(
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ':gear: Open Testbot Report',
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Open',
          emoji: true,
        },
        value: 'click_me_123',
        url: testbotUrl,
        action_id: 'button-action',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ':scroll: View the Jenkins Logs',
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Open',
          emoji: true,
        },
        value: 'click_me_123',
        url: jenkinsUrl,
        action_id: 'button-action',
      },
    }
  );
};

(async () => {
  if (jestOutput.success) {
    await superagent.post(successWebhook).send({
      text: ':tada: Fusebit API Full Pass :tada:',
    });
    return;
  }

  const failedTests = jestOutput.testResults
    .filter((testResult) => testResult.status === Status.Failed)
    .map((failedTest) => failedTest.name.replace(testPathPrefix, ''));
  const commits = parseCommits();
  const runId = fs.readFileSync('/tmp/rp-results-id', 'utf8');

  const block = slackBlockHeader;

  addErrorBlock(block, failedTests);
  addCommitterBlock(block, commits);
  addFooter(block, makeJenkinsUrl(), makeTestbotUrl(runId));

  // Just in case it fails to send...
  console.log(JSON.stringify(block, null, 2));

  try {
    await superagent.post(failureWebhook).send(block);
  } catch (e) {
    console.log(e);
  }
})();
