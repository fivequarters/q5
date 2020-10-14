import { IAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import * as Registry from './registry';

import { request } from '@5qtrs/request';

const fs = require('fs');

const libnpm = require('libnpm');

const { getAccount } = setupEnvironment();
const regScope = '@package';

const masterAccount = 'acc-00000000';
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

const resetScope = async (account: IAccount) => {
  let config = await Registry.getConfig(account);

  config.scopes = [regScope];
  expect(await Registry.putConfig(account, config)).toBe(200);

  const { globalReg, accountReg } = await Registry.setGlobal(masterAccount, account, masterScope, regScope);

  config = await Registry.getConfig(account);
  expect(config.scopes).toEqual([regScope, masterScope]);

  return { globalReg, accountReg };
};

/* Tests */
describe('npm', () => {
  test('publish account package', async () => {
    const account = getAccount();
    await resetScope(account);

    const { manifest, tarData } = preparePackage(regScope);
    await libnpm.publish(manifest, tarData, getOpts(regScope, account));

    // Validate that the results match what's expected.
    const mani = await libnpm.manifest(manifest.name, getOpts(regScope, account));
    const packu = await libnpm.packument(manifest.name, getOpts(regScope, account));

    const name = `${regScope}/libnpmpublish`;
    expect(mani).toMatchObject({ name, version: '1.0.0', _id: `${name}@1.0.0` });
    expect(packu).toMatchObject({ _id: name, 'dist-tags': { latest: '1.0.0' }, versions: { '1.0.0': { name } } });

    await libnpm.unpublish(`${name}@1.0.0`, getOpts(regScope, account));
  }, 180000);

  test('search', async () => {
    const account = getAccount();
    await resetScope(account);
    const { registryPath, registryUrl } = getRegistryUrl(account);

    const { manifest, tarData } = preparePackage(regScope);

    await libnpm.publish(manifest, tarData, getOpts(regScope, account));
    const results = await libnpm.search(manifest.name, { ...getOpts(regScope, account), registry: registryUrl });
    console.log(`Search Results: ${JSON.stringify(results)}`);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe(manifest.name);
  }, 180000);

  test('get from master', async () => {
    const account = getAccount();
    const { globalReg, accountReg } = await resetScope(account);
    const { registryPath, registryUrl } = getRegistryUrl(account);
    const fullOpts = {
      ...getOpts(regScope, account),
      ...getOpts(masterScope, account),
    };

    // Publish a regScope package
    const { manifest, tarData } = preparePackage(regScope);
    await libnpm.publish(manifest, tarData, getOpts(regScope, account));

    // Get installed package and tarball
    const pkg = await accountReg.get(manifest.name);

    // Add them to the globalReg with a slightly different name
    pkg._id = `${masterScope}/libnpm`;
    pkg.name = `${masterScope}/libnpm`;

    // Tweak the version
    const gv = pkg.versions['1.0.0'];
    gv.name = pkg.name;
    gv._id = `${pkg.name}@${gv.version}`;
    gv.dist.tarball.scope = masterScope;
    gv.dist.tarball.name = 'libnpm';

    // Put the resulting object.
    globalReg.put(`${pkg.name}`, pkg, manifest.version, tarData);

    // Request package from accountReg, validate it is accepted
    let results = await libnpm.search(`${regScope}/libnpmpublish`, {
      ...getOpts(regScope, account),
      registry: registryUrl,
    });
    expect(results.length).toBe(1);

    results = await libnpm.search(`libnpm`, {
      ...getOpts(regScope, account),
      registry: registryUrl,
    });
    expect(results.length).toBe(2);

    // Validate that the results match what's expected.
    const mani = await libnpm.manifest(`${masterScope}/libnpm`, fullOpts);
    const packu = await libnpm.packument(`${masterScope}/libnpm`, fullOpts);

    const name = `${masterScope}/libnpm`;
    expect(mani).toMatchObject({ name, version: '1.0.0', _id: `${name}@1.0.0` });
    expect(packu).toMatchObject({ _id: name, 'dist-tags': { latest: '1.0.0' }, versions: { '1.0.0': { name } } });

    let data = await libnpm.tarball(results[0].versions['1.0.0'].dist.tarball, {
      scope: results[0].name.split('/').shift(),
      ...fullOpts,
    });
    expect(data).toEqual(tarData);
    data = await libnpm.tarball(results[1].versions['1.0.0'].dist.tarball, {
      scope: results[1].name.split('/').shift(),
      ...fullOpts,
    });
    expect(data).toEqual(tarData);
    // data = await libnpm.tarball(results[1].versions['1.0.0'].dist.tarball, fullOpts);
  }, 180000);
});
