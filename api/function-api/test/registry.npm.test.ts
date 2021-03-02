import express, {Express, NextFunction, Request, Response} from 'express';
import bodyParser from 'body-parser';
import * as fs from 'fs';
import * as http from 'http';
import {AddressInfo} from 'net';
import {IFunctionApiRequest} from '@5qtrs/npm';
import {MemRegistry} from '@5qtrs/registry';
import libnpm from 'libnpm';
import npmApp from "../src/routes/controllers/npm";

jest.mock("../src/routes/middleware/authorize.js");
// @ts-ignore
import authorize from "../src/routes/middleware/authorize.js";

import manifest from './mock/sample-npm.manifest.json';

const tarData = fs.readFileSync('test/mock/sample-npm.tgz');
const logEnabled = false;

const PACKAGE_SCOPE = '@testscope';
const PACKAGE_NAME = 'foobar';
const PACKAGE_FULL_NAME = PACKAGE_SCOPE + '/' + PACKAGE_NAME;
const MANIFEST_VERSIONS = Object.freeze(['1.0.1', '1.0.2', '1.0.3']);
const DIST_TAGS = 'dist-tags';
const NPM_ROUTE_SCOPE = '/something_else';


const startServer: (server: http.Server) => Promise<http.Server> = async (server) => {
  await new Promise(resolve => {
    server.listen(0, resolve);
  });
  return server;
};

const getServerPort: (server: http.Server) => number = (server) => {
  return (server.address() as AddressInfo).port;
};


const getServerUrl: (server: http.Server) => string = (server) => {
  return `http://localhost:${getServerPort(server)}${NPM_ROUTE_SCOPE}`;
}

const setTarballRootUrl: (app: Express, url: string) => void = (app, url) => {
  app.use((req: Request | IFunctionApiRequest, res: Response, next: NextFunction) => {
    (req as IFunctionApiRequest).tarballRootUrl = url;
    next();
  });
};

const setLoggerMiddleware: (app: Express) => void = (app) => {
  if (logEnabled) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.url}\n${JSON.stringify(req.headers)}\n${JSON.stringify(req.body, null, 2)}`);
      next();
    })
  }
}

const applyServerRoutes: (app: Express) => void = (app) => {
  app.use(NPM_ROUTE_SCOPE, npmApp);
};

const startExpress: () => Promise<ITestVariables> = async () => {
  const app: Express = express();
  const { registry, handler } = MemRegistry.handler();

  const server = http.createServer(app);
  await startServer(server);
  const url: string = getServerUrl(server);

  app.use(bodyParser.json());
  app.use(handler);
  setLoggerMiddleware(app);
  setTarballRootUrl(app, url);
  applyServerRoutes(app);

  const onClosePromise: Promise<void> = new Promise(
    (resolve, reject) =>
      server.on('close', resolve)
  );
  return {
    url: `${url}/`,
    registry,
    onClosePromise,
    server,
    app
  }
}

interface ITestVariables {
  url: string;
  registry: MemRegistry;
  onClosePromise: Promise<void>;
  server: http.Server;
  app: Express;
}

let testVariables: ITestVariables;


describe('registry Package tests', () => {

  beforeEach(async () => {
    // startserver
    testVariables = await startExpress();

  }, 10001);

  afterEach(async () => {
    // stopserver
    testVariables.server.close();
    await testVariables.onClosePromise;
  }, 10002);

  it('create package', async () => {
    const { registry, url } = testVariables;

    // Verify empty registry package
    expect(registry.registry.pkg[PACKAGE_FULL_NAME]).toBeUndefined();
    // Publish a package
    await libnpm.publish(manifest, tarData, { registry: url });
    // Expect updates in registry
    expect(registry.registry.pkg[PACKAGE_FULL_NAME].name).toBeTruthy();
    expect(registry.registry.pkg[PACKAGE_FULL_NAME].versions[manifest.version].dist.tarball).toMatchObject({
      scope: PACKAGE_SCOPE,
      name: PACKAGE_NAME,
      version: manifest.version,
    });
  });

  it('unpublish package version', async () => {
    const { registry, url } = testVariables;

    // Publish multiple package versions
    await Promise.all(
      MANIFEST_VERSIONS.map(async manifestVersion => {
        await libnpm.publish({ ...manifest, version: manifestVersion }, tarData, { registry: url });
      })
    );
    // Expect to see all versions published
    expect(Object.keys(registry.registry.pkg[PACKAGE_FULL_NAME].versions))
      .toEqual(expect.arrayContaining([...MANIFEST_VERSIONS]));
    // Unpublish one version
    const removedVersion = MANIFEST_VERSIONS[1];

    await libnpm.unpublish(`${PACKAGE_FULL_NAME}@${removedVersion}`, { registry: url });
    // Expect to see all published versions other than removed one
    expect(Object.keys(registry.registry.pkg[PACKAGE_FULL_NAME].versions)).toEqual(
      expect.arrayContaining(MANIFEST_VERSIONS.filter(version => version !== removedVersion))
    );
  });

  it('latest tag updates', async () => {
    const { registry, url } = testVariables;
    // Publish multiple package versions
    await Promise.all(
      MANIFEST_VERSIONS.map(async manifestVersion => {
        await libnpm.publish({ ...manifest, version: manifestVersion }, tarData, { registry: url });
      })
    );
    const LATEST_VERSION = MANIFEST_VERSIONS[MANIFEST_VERSIONS.length - 1];
    // Expect latest to be highest version number (1.0.3)
    expect(registry.registry.pkg[PACKAGE_FULL_NAME][DIST_TAGS].latest).toEqual(LATEST_VERSION);
    // Unpublish latest
    await libnpm.unpublish(`${PACKAGE_FULL_NAME}@${LATEST_VERSION}`, { registry: url });
    // expect latest to be next highest version number (1.0.2)
    const SECOND_LATEST_VERSION = MANIFEST_VERSIONS[MANIFEST_VERSIONS.length - 2];
    expect(registry.registry.pkg[PACKAGE_FULL_NAME][DIST_TAGS].latest).toEqual(SECOND_LATEST_VERSION);
  }, 1000000);

  it('unpublish all causes removal', async () => {
    const { registry, url } = testVariables;
    // Publish multiple package versions
    await Promise.all(
      MANIFEST_VERSIONS.map(async manifestVersion => {
        await libnpm.publish({ ...manifest, version: manifestVersion }, tarData, { registry: url });
      })
    );

    // Verify 3 items exist
    expect(Object.keys(registry.registry.pkg[PACKAGE_FULL_NAME].versions)).toEqual(
      expect.arrayContaining([...MANIFEST_VERSIONS])
    );

    for (const manifestVersion of MANIFEST_VERSIONS) {
      await libnpm.unpublish(`${PACKAGE_FULL_NAME}@${manifestVersion}`, { registry: url });
    }
    // Package should be automatically removed
    expect(registry.registry.pkg[PACKAGE_FULL_NAME]).toBeUndefined();
  })

  it('unpublish entire package', async () => {
    const { registry, url } = testVariables;
    // Publish multiple package versions
    const publishPackages = async () => {
      await Promise.all(
        MANIFEST_VERSIONS.map(async manifestVersion => {
          await libnpm.publish({ ...manifest, version: manifestVersion }, tarData, { registry: url });
        })
      );
    };
    await publishPackages();
    // Verify 3 items exist
    const expectKeysPublished = () => {
      expect(Object.keys(registry.registry.pkg[PACKAGE_FULL_NAME].versions)).toEqual(
        expect.arrayContaining([...MANIFEST_VERSIONS])
      );
    };
    expectKeysPublished();

    const expectSearchSuccess = async (expectedSuccess: boolean) => {
      const packages: [] = await libnpm.search(PACKAGE_NAME, { registry: url });
      expect(packages).toHaveLength(expectedSuccess ? 1 : 0);
    }
    await expectSearchSuccess(true);

    // Unpublish without version, removes all
    await libnpm.unpublish(PACKAGE_FULL_NAME, { registry: url });
    expect(registry.registry.pkg[PACKAGE_FULL_NAME]).toBeUndefined();
    await expectSearchSuccess(false);

    // Republish
    await publishPackages();
    expectKeysPublished();
    await expectSearchSuccess(true);

    // Unpublish with *
    await libnpm.unpublish(`${PACKAGE_FULL_NAME}@*`, { registry: url });
    expect(registry.registry.pkg[PACKAGE_FULL_NAME]).toBeUndefined();
    await expectSearchSuccess(false);

  });

  it('can republish to namespace of unpublished package', async () => {
    const { registry, url } = testVariables;
    // Publish multiple package versions
    await Promise.all(
      MANIFEST_VERSIONS.map(async manifestVersion => {
        await libnpm.publish({ ...manifest, version: manifestVersion }, tarData, { registry: url });
      })
    );
    // Verify 3 items exist
    expect(Object.keys(registry.registry.pkg[PACKAGE_FULL_NAME].versions)).toEqual(
      expect.arrayContaining([...MANIFEST_VERSIONS])
    );
    // Unpublish without version, removes all
    await libnpm.unpublish(PACKAGE_FULL_NAME, { registry: url });
    expect(registry.registry.pkg[PACKAGE_FULL_NAME]).toBeUndefined();
    // Republish to same namespace
    await Promise.all(
      MANIFEST_VERSIONS.map(async manifestVersion => {
        await libnpm.publish({ ...manifest, version: manifestVersion }, tarData, { registry: url });
      })
    );
    // Verify 3 items exist
    expect(Object.keys(registry.registry.pkg[PACKAGE_FULL_NAME].versions)).toEqual(
      expect.arrayContaining([...MANIFEST_VERSIONS])
    );
  });

  it('verify tarball match', async () => {
    const { registry, url } = testVariables;

    // Publish a package
    await libnpm.publish(manifest, tarData, { registry: url });
    expect(registry.registry.pkg[PACKAGE_FULL_NAME].name).toBeTruthy();
    expect(registry.registry.pkg[PACKAGE_FULL_NAME].versions[manifest.version].dist.tarball).toMatchObject({
      scope: PACKAGE_SCOPE,
      name: PACKAGE_NAME,
      version: manifest.version
    });

    const tarball: any = await libnpm.tarball(PACKAGE_FULL_NAME, { registry: url });
    expect(tarball).toHaveLength(tarData.length);
    expect(tarball.equals(tarData)).toBeTruthy();

  });

  it('verify manifest', async () => {
    const { url } = testVariables;
    // Publish a package
    await libnpm.publish(manifest, tarData, { registry: url });
    // Fetch Manifest
    const m: any = await libnpm.manifest(PACKAGE_FULL_NAME, { registry: url });
    expect(m.name).toBe(PACKAGE_FULL_NAME);
  });

  it('search for package', async () => {
    const { registry, url } = testVariables;
    // Publish a package
    await libnpm.publish(manifest, tarData, { registry: url });

    let packages: [] = await libnpm.search('non-matching-string', { registry: url });
    expect(packages).toHaveLength(0);
    packages = await libnpm.search(PACKAGE_NAME.slice(2, 5), { registry: url });
    expect(packages).toHaveLength(1);

  });

});
