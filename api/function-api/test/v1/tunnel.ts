import express from 'express';
const localtunnel = require('localtunnel');

const startTunnel = async (serverPort: number, lastDomain?: string) => {
  const tunnel = await localtunnel({
    port: serverPort,
    host: 'https://tunnel.dev.fusebit.io',
    ...(lastDomain ? { subdomain: lastDomain } : {}),
  });
  const subdomain = tunnel.clientId;

  return { tunnel, subdomain };
};

const startHttpServer = (port: number) => {
  const app = express();

  const listen = async () => {
    return new Promise((resolve) => {
      const svc = app.listen(port, () => resolve(svc));
    });
  };

  return { app, listen };
};

export { startTunnel, startHttpServer };
