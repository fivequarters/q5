import { Request, Response } from 'express';
import express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import libnpm from 'libnpm';
import { AddressInfo } from 'net';

import bodyParser from 'body-parser';

import { packageGet, packagePut, searchGet, tarballGet } from '../src';
import { IFunctionApiRequest } from '../src/request';

const log = console.log;

const enableForceClose = (server: http.Server) => {
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  return () => {
    sockets.forEach((s: any) => s.destroy());
  };
};

const mockRegistry = () => {
  const registry: { [key: string]: any } = { pkg: {}, tgz: {} };
  return {
    registry,
    handler: (reqExpress: Request, res: Response, next: any) => {
      const req: IFunctionApiRequest = reqExpress as IFunctionApiRequest;

      req.registry = {
        put: (key: string, pkg: any, payload: any): number => {
          registry.pkg[key] = pkg;
          registry.tgz[key] = payload;
          return 200;
        },
        get: (key: any): any => {
          return registry.pkg[key];
        },
        tarball: (key: any): any => {
          return registry.tgz[key];
        },
        search: (keywords: string[]): any => {
          return {};
        },
      };

      return next();
    },
  };
};

const startServer = async (app: express.Application) => {
  const server = http.createServer(app);
  const forceClose = enableForceClose(server);
  const port: number = await new Promise((resolve, reject) => {
    server.listen(0, () => {
      resolve((server.address() as AddressInfo).port);
    });
  });

  return { server, forceClose, port };
};

const startExpress = async (): Promise<any> => {
  const app = express();
  const { registry, handler: regHandler } = mockRegistry();
  const { server, forceClose, port } = await startServer(app);

  app.use(bodyParser.json());
  app.use(regHandler);
  app.use((req: any, res: any, next: any) => {
    log(`${req.method} ${req.url}\n${JSON.stringify(req.headers)}\n${JSON.stringify(req.body, null, 2)}`);
    return next();
  });

  return { app, registry, regHandler, server, forceClose, port };
};

let globalServer: any;

beforeEach(async () => {
  globalServer = await startExpress();
});

afterEach(async () => {
  globalServer.forceClose();
  await new Promise((resolve, reject) => globalServer.server.close(resolve));
});

const createServer = () => {
  const { app, registry, server, forceClose, port } = globalServer;
  app.put(`/:name`, packagePut());
  app.get(`/:name`, packageGet());
  app.get('/:scope?/:name/-/:scope2?/:filename/', tarballGet());
  app.get('/-/v1/search', searchGet());
  const url = `http://localhost:${port}/`;

  return { registry, url };
};

describe('packagePut', () => {
  it('putAddsRegistry', async () => {
    const { registry, url } = createServer();

    const manifest = JSON.parse(fs.readFileSync('test/mock/sample-npm.manifest.json').toString('utf8'));
    const tarData = fs.readFileSync('test/mock/sample-npm.tgz');

    let m: any;

    // Publish a package
    await libnpm.publish(manifest, tarData, { registry: url });
    expect(registry.pkg['@testscope/foobar'].name).toBeTruthy();

    // Get a package
    m = await libnpm.manifest('@testscope/foobar', { registry: url });
    expect(m.name).toBe('@testscope/foobar');

    // Get a tarball
    m = await libnpm.tarball('@testscope/foobar', { registry: url });
    expect(m).toHaveLength(tarData.length);
    expect(m.equals(tarData)).toBeTruthy();

    // Search for a package
    m = await libnpm.search('foo', { registry: url });
    expect(m).toHaveLength(0);
    m = await libnpm.search('@testscope/foobar', { registry: url });
    expect(m).toHaveLength(1);
  });
});
