import * as fs from 'fs';
import { IHttpResponse, request } from '@5qtrs/request';
import * as Constants from '@5qtrs/constants';

import * as Registry from './registry';
import { putFunction, waitForBuild } from './sdk';

import { getEnv } from './setup';
import * as npm from '@npm/types';
import libnpm from "libnpm";

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const regScope = '@package';

const masterAccount = 'acc-00000000';
const masterScope = '@fuse-int';

const VALID_PKG = 'test/mock/sample-npm.tgz';
const BROKEN_PKG = 'test/mock/sample-broken-npm.tgz';

const funcWithDep = (pkgName: string) => ({
  nodejs: {
    files: {
      'index.js': `const s = require("${pkgName}"); module.exports = (ctx, cb) => cb(null, { body: typeof s });`,
      'package.json': { engines: { node: '10' }, dependencies: { [pkgName]: '*' } },
    },
  },
});

/* Utility functions */
const getRegistryUrl = (): any => {
  const host = Constants.API_PUBLIC_ENDPOINT.replace(/http[s]?:\/\//, '');
  const registryPath = `${host}/v1/account/${account.accountId}/registry/default/npm/`;
  return { registryPath, registryUrl: `http://${registryPath}` };
};

const getOpts = (scope: string): any => {
  const { registryPath, registryUrl } = getRegistryUrl();

  const registry = { [`${scope}:registry`]: registryUrl };
  const token = {
    [`//${registryPath}:token`]: account.accessToken,
  };

  return { ...registry, ...token };
};

const preparePackage = (scope: string, pkgFile: string = VALID_PKG) => {
  const tarData = fs.readFileSync(pkgFile);
  const manifest = {
    name: `${scope}/libnpmpublish`,
    version: '1.0.0',
    description: 'some stuff',
  };

  return { manifest, tarData };
};

const resetScope = async () => {
  let config = await Registry.getConfig(account);

  config.scopes = [regScope];
  expect(await Registry.putConfig(account, config)).toBe(200);

  const { globalReg, accountReg } = await Registry.setupGlobal(masterAccount, account, masterScope, regScope);

  config = await Registry.getConfig(account);
  expect(config.scopes).toEqual([regScope, masterScope]);

  return { globalReg, accountReg };
};

let oldGlobalConfig: any;

beforeEach(async () => {
  oldGlobalConfig = await Registry.getGlobal();
  await resetScope();
}, 180000);

afterEach(async () => {
  if (oldGlobalConfig) {
    await Registry.setGlobal(oldGlobalConfig);
  }
  oldGlobalConfig = undefined;
}, 180000);

/* Tests */
describe('npm', () => {
  test('publish account package', async () => {
    const { manifest, tarData } = preparePackage(regScope);
    await libnpm.publish(manifest, tarData, getOpts(regScope));

    // Validate that the results match what's expected.
    const mani = await libnpm.manifest(manifest.name, getOpts(regScope));
    const packu = await libnpm.packument(manifest.name, getOpts(regScope));

    const name = `${regScope}/libnpmpublish`;
    expect(mani).toMatchObject({ name, version: '1.0.0', _id: `${name}@1.0.0` });
    expect(packu).toMatchObject({ _id: name, 'dist-tags': { latest: '1.0.0' }, versions: { '1.0.0': { name } } });

    await libnpm.unpublish(`${name}@1.0.0`, getOpts(regScope));
  }, 180000);

  test('search', async () => {
    const { registryPath, registryUrl } = getRegistryUrl();

    const { manifest, tarData } = preparePackage(regScope);

    await libnpm.publish(manifest, tarData, getOpts(regScope));
    const results = await libnpm.search(manifest.name, { ...getOpts(regScope), registry: registryUrl });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe(manifest.name);
  }, 180000);

  test('get from master', async () => {
    const { globalReg, accountReg } = await resetScope();
    const { registryPath, registryUrl } = getRegistryUrl();
    const fullOpts = {
      ...getOpts(regScope),
      ...getOpts(masterScope),
    };

    // Publish a regScope package
    const { manifest, tarData } = preparePackage(regScope);
    await libnpm.publish(manifest, tarData, getOpts(regScope));

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

    // Put the resulting object directly, bypassing function-api, because we're using a ficticious account as
    // a proxy for a real deployment where it'd be the account only fusebit operators have access to.
    globalReg.put(`${pkg.name}`, pkg, manifest.version, tarData);

    // Request package from accountReg, validate it is accepted
    let results = await libnpm.search(`${regScope}/libnpmpublish`, {
      ...getOpts(regScope),
      registry: registryUrl,
    });
    expect(results.length).toBe(1);

    results = await libnpm.search(`libnpm`, {
      ...getOpts(regScope),
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
  }, 180000);

  test('build', async () => {
    const { registryPath, registryUrl } = getRegistryUrl();

    // Start by publishing a package we know fails
    let pkg = preparePackage(regScope, BROKEN_PKG);

    let manifest = pkg.manifest;
    let tarData = pkg.tarData;
    await libnpm.publish(manifest, tarData, getOpts(regScope));

    // Defensively delete the function.
    let response = await putFunction(account, boundaryId, function1Id, funcWithDep(manifest.name));
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 15, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }

    response = await request({ method: 'GET', url: response.data.location });
    expect(response).toBeHttp({ statusCode: 500 });

    // Now publish a known working package, remove the function, and build
    pkg = preparePackage(regScope, VALID_PKG);
    manifest = pkg.manifest;
    tarData = pkg.tarData;

    await libnpm.publish(manifest, tarData, getOpts(regScope));

    response = await putFunction(account, boundaryId, function2Id, funcWithDep(manifest.name));
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 15, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }

    response = await request({ method: 'GET', url: response.data.location });
    expect(response).toBeHttp({ statusCode: 200, data: 'object' });
  }, 180000);

  test('registry scope configure', async () => {
    const config = await Registry.getConfig(account);
    expect(config.scopes.filter((e: string) => e.indexOf(Constants.REGISTRY_RESERVED_SCOPE_PREFIX) === 0)).toHaveLength(
      1
    );

    // Test that roundtripping works
    expect(await Registry.putConfig(account, config)).toBe(200);

    // Try to add an invalid scope
    config.scopes = [...config.scopes, Constants.REGISTRY_RESERVED_SCOPE_PREFIX + 'foobar'];
    expect(await Registry.putConfig(account, config)).toBe(400);
  }, 180000);
});
