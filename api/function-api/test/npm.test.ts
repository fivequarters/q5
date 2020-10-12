import { IAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import * as Registry from './registry';

const fs = require('fs');

const libnpm = require('libnpm');

const { getAccount } = setupEnvironment();

const regScope = '@package';
const masterScope = '@fusebit';

/* Utility functions */
const getRegistryUrl = (account: IAccount): any => {
  const registryPath = `localhost:3001/v1/account/${account.accountId}/registry/default/npm/`;
  return { registryPath, registryUrl: `http://${registryPath}` };
};

const getOpts = (scope: string, account: IAccount): any => {
  const { registryPath, registryUrl } = getRegistryUrl(account);

  const registry = { [`${scope}:registry`]: registryUrl };
  const token = {
    [`//${registryPath}:token`]: account.accessToken,
  };

  return { ...registry, ...token };
};

const preparePackage = (scope: string) => {
  const tarData = fs.readFileSync('test/mock/sample-npm.tgz');
  const manifest = {
    name: `${scope}/libnpmpublish`,
    version: '1.0.0',
    description: 'some stuff',
  };

  return { manifest, tarData };
};

/* Tests */
describe('npm', () => {
  test.only('registry config', async () => {
    const account = getAccount();
    let config = await Registry.getConfig(account);

    config.scopes = [regScope];
    expect(await Registry.putConfig(account, config)).toBe(200);

    config = await Registry.getConfig(account);
    expect(config.scopes).toEqual([regScope]);
  }, 180000);

  test('is healthy', async () => {
    const account = getAccount();

    await libnpm.manifest(`${regScope}/libnpmpublish`, getOpts(regScope, account));
  }, 180000);

  test('publish account package', async () => {
    const account = getAccount();

    const scope = regScope;

    const { manifest, tarData } = preparePackage(scope);

    await libnpm.publish(manifest, tarData, getOpts(scope, account));

    // Validate that the results match what's expected.
    const mani = await libnpm.manifest(manifest.name, getOpts(scope, account));
    const packu = await libnpm.packument(manifest.name, getOpts(scope, account));

    console.log(`manifest: ${JSON.stringify(mani)}`);
    console.log(`packument: ${JSON.stringify(packu)}`);

    // await libnpm.unpublish(manifest.name, getOpts(account));
  }, 180000);

  test('search', async () => {
    const account = getAccount();
    const { registryPath, registryUrl } = getRegistryUrl(account);

    const { manifest, tarData } = preparePackage(regScope);

    await libnpm.publish(manifest, tarData, getOpts(regScope, account));
    const results = await libnpm.search(manifest.name, { ...getOpts(regScope, account), registry: registryUrl });
    console.log('XXXYYYXXX', JSON.stringify(results, null, 2));
  }, 180000);
  /*
   * Pull a package from the master registry
   * Get search results from the master and local registry
   * Update scopes in registry
   */
});
