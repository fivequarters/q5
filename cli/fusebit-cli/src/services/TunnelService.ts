const fusetunnel = require('@fusebit/tunnel');
import Http from 'http';

const startTunnel = async (serverPort: number, lastDomain?: string) => {
  const tunnel = await fusetunnel({
    port: serverPort,
    host: process.env.FUSETUNNEL_ENDPOINT || 'https://tunnel.dev.fusebit.io',
    ...(lastDomain ? { subdomain: lastDomain } : {}),
  });
  const subdomain = tunnel.clientId;

  return { tunnel, subdomain };
};

const startHttpServer = async (jsonHandler: (req: any) => Promise<any>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = Http.createServer(async (req, res) => {
      let hasError = false;
      const error = (status: number, message: string) => {
        if (hasError) {
          return;
        }
        hasError = true;
        console.log('E: ', status, message);
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status, message }));
      };
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', async () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch (e) {
          return error(400, `Request is not valid JSON: '${data}'`);
        }
        const result = await jsonHandler(json);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      });
      req.on('error', (e) => error(501, `Error processing the request: ${e.stack || e.message}`));
    });
    // @ts-ignore
    server.listen(0, (e) => (e ? reject(e) : resolve(server.address().port)));
  });
};

export { startTunnel, startHttpServer };
