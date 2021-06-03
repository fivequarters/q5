import express from 'express';
const fusetunnel = require('@fusebit/tunnel');

const startTunnel = async (serverPort: number, lastDomain?: string) => {
  const tunnel = await fusetunnel({
    port: serverPort,
    host: 'https://tunnel.dev.fusebit.io',
    ...(lastDomain ? { subdomain: lastDomain } : {}),
  });
  const subdomain = tunnel.clientId;

  return { tunnel, subdomain };
};

const startHttpServer = (port: number): any => {
  const app = express();

  app.use(express.json());

  const listen = async () => {
    return new Promise((resolve) => {
      const svc = app.listen(port, () => resolve(svc));
    });
  };

  return { app, listen };
};

export { startTunnel, startHttpServer };
