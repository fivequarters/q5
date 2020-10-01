import { IAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';

const fs = require('fs');
const crypto = require('crypto');
const ssri = require('ssri');

const libnpm = require('libnpm');

const { getAccount } = setupEnvironment();

const scope = '@testscope';

const getOpts = (account: IAccount): any => {
  const registryPath = `localhost:3001/v1/account/${account.accountId}/subscription/${account.subscriptionId}/registry/default/npm/`;
  const registryUrl = `http://${registryPath}`;

  const registry = { [`${scope}:registry`]: registryUrl };
  const token = {
    [`//${registryPath}:token`]: account.accessToken,
  };

  return { ...registry, ...token };
};

const preparePackage = () => {
  const tarData = fs.readFileSync('test/mock/sample-npm.tgz');
  const manifest = {
    name: `${scope}/libnpmpublish`,
    version: '1.0.0',
    description: 'some stuff',
  };

  return { manifest, tarData };
};

describe('npm', () => {
  test('is healthy', async () => {
    const account = getAccount();

    await libnpm.manifest(`${scope}/libnpmpublish`, getOpts(account));
  }, 180000);

  test('publish', async () => {
    const account = getAccount();

    const { manifest, tarData } = preparePackage();

    await libnpm.publish(manifest, tarData, getOpts(account));

    // Validate that the results match what's expected.
    const mani = await libnpm.manifest(manifest.name, getOpts(account));
    const packu = await libnpm.packument(manifest.name, getOpts(account));

    // await libnpm.unpublish(manifest.name, getOpts(account));
  }, 180000);
});
