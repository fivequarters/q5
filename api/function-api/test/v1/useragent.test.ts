import * as semver from 'semver';

import { supportedClientVersion } from '../../src/routes/middleware/version_check';

import { getFunction, putFunction } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const simpleFuncSpec = {
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx.fusebit }; };',
    },
  },
};

describe('User Agent', () => {
  test('Validate User Agent MinVer Requirements', async () => {
    let response = await putFunction(account, boundaryId, function1Id, simpleFuncSpec);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });

    account.userAgent = 'fusebit-editor/1.4.3';
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 400 });

    account.userAgent = `fusebit-editor/${semver.minVersion(supportedClientVersion.editor.v)}`;
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });

    account.userAgent = 'fusebit-cli/1.8.9';
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 400 });

    account.userAgent = `fusebit-cli/${semver.minVersion(supportedClientVersion.client.v)}`;
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);
});
