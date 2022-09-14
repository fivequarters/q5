import nock from 'nock';
import { resolve_one_external_dependency } from '@5qtrs/function-lambda';

const pkg = 'react';
const semver = '18.2.0';

const makeSources = (name = pkg, sv = semver) => ({
  unpkg: { baseUrl: 'https://unpkg.com', path: `/${name}@${sv}/package.json` },
  jsdelvr: { baseUrl: 'https://cdn.jsdelivr.net', path: `/npm/${name}@${sv}/package.json` },
});

const makeCtx = (name = pkg, sv = semver): any => ({
  options: {
    internal: {
      pending_dependencies: {
        [name]: sv,
      },
      resolved_dependencies: {},
    },
  },
});

const sources = makeSources();

const results = {
  statusCode: 200,
  body: { name: pkg, version: semver },
};

beforeEach(() => {
  nock.cleanAll();
  process.env.LAMBDA_UNPKG_TIMEOUT = '200';
});

describe('Module Resolving', () => {
  test('A single query is made', async () => {
    const ctx = makeCtx();
    let unpkgCnt = 0;
    let jsdelvrCnt = 0;

    const unpkg = nock(sources.unpkg.baseUrl)
      .persist()
      .get(sources.unpkg.path)
      .reply(200, () => {
        unpkgCnt++;
        return results.body;
      });
    const jsdelvr = nock(sources.jsdelvr.baseUrl)
      .persist()
      .get(sources.jsdelvr.path)
      .reply(200, () => {
        jsdelvrCnt++;
        return results.body;
      });

    await new Promise((resolve) => resolve_one_external_dependency(ctx, pkg, resolve));
    expect(unpkg.isDone() ? !jsdelvr.isDone() : jsdelvr.isDone()).toBe(true);
    expect(jsdelvrCnt === 1 ? unpkgCnt === 0 : unpkgCnt === 1).toBe(true);
    expect(ctx.options.internal.resolved_dependencies[pkg]).toEqual({ registry: 'public', version: semver });
  });

  test('Multiple queries hit both endpoints', async () => {
    const ctx = makeCtx();
    let unpkgCnt = 0;
    let jsdelvrCnt = 0;

    const unpkg = nock(sources.unpkg.baseUrl)
      .persist()
      .get(sources.unpkg.path)
      .reply(200, () => {
        unpkgCnt++;
        return results.body;
      });
    const jsdelvr = nock(sources.jsdelvr.baseUrl)
      .persist()
      .get(sources.jsdelvr.path)
      .reply(200, () => {
        jsdelvrCnt++;
        return results.body;
      });

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => resolve_one_external_dependency(ctx, pkg, resolve));
    }

    expect(unpkg.isDone() && jsdelvr.isDone()).toBe(true);
    expect(ctx.options.internal.resolved_dependencies[pkg]).toEqual({ registry: 'public', version: semver });
    expect(jsdelvrCnt + unpkgCnt).toBe(10);
  });

  test('Unpkg delayed responses are still satistifed', async () => {
    const ctx = makeCtx();
    let jsdelvrCnt = 0;

    const unpkg = nock(sources.unpkg.baseUrl).persist().get(sources.unpkg.path).delay(10000).reply(500, 'not found');

    const jsdelvr = nock(sources.jsdelvr.baseUrl)
      .persist()
      .get(sources.jsdelvr.path)
      .reply(200, () => {
        jsdelvrCnt++;
        return results.body;
      });

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => resolve_one_external_dependency(ctx, pkg, resolve));
    }

    expect(jsdelvrCnt).toBe(10);
    expect(unpkg.isDone() && jsdelvr.isDone()).toBe(true);
    expect(ctx.options.internal.resolved_dependencies[pkg]).toEqual({ registry: 'public', version: semver });
    nock.abortPendingRequests();
  });

  test('Jsdelvr delayed responses are still satistifed', async () => {
    const ctx = makeCtx();
    let unpkgCnt = 0;

    const unpkg = nock(sources.unpkg.baseUrl)
      .persist()
      .get(sources.unpkg.path)
      .reply(200, () => {
        unpkgCnt++;
        return results.body;
      });

    const jsdelvr = nock(sources.jsdelvr.baseUrl)
      .persist()
      .get(sources.jsdelvr.path)
      .delay(10000)
      .reply(500, 'not found');

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => resolve_one_external_dependency(ctx, pkg, resolve));
    }

    expect(unpkgCnt).toBe(10);
    expect(unpkg.isDone() && jsdelvr.isDone()).toBe(true);
    expect(ctx.options.internal.resolved_dependencies[pkg]).toEqual({ registry: 'public', version: semver });
    nock.abortPendingRequests();
  });
});
