import express, { Application, Express, NextFunction, Request, Response } from 'express';

import bodyParser from 'body-parser';

import * as http from 'http';

import { AddressInfo } from 'net';

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

const startServer = async (app: Application) => {
  const server = http.createServer(app);
  const forceClose = enableForceClose(server);
  const port: number = await new Promise((resolve, reject) => {
    server.listen(0, () => {
      resolve((server.address() as AddressInfo).port);
    });
  });

  return { server, forceClose, port };
};

type IAddHandler = (app: Application) => undefined;
const startExpress = async (addHandlers: IAddHandler = undefined): Promise<any> => {
  const app = express();
  const { server, forceClose, port } = await startServer(app);

  const url = `http://localhost:${port}`;

  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).tarballRootUrl = url;
    return next();
  });

  app.use(bodyParser.json());

  /* Add Handlers Here */
  if (addHandlers) {
    addHandlers(app);
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    log(`${req.method} ${req.url}\n${JSON.stringify(req.headers)}\n${JSON.stringify(req.body, null, 2)}`);
    return next();
  });

  return { app, server, forceClose, port, url };
};

export { startExpress };
