const http = require('http');
const localtunnel = require('localtunnel');

const serverPort = 3001;
const inspectionPort = 4040;

let tunnel;
let subdomain;

const startTunnel = async () => {
  tunnel = await localtunnel({ port: serverPort, ...(subdomain ? { subdomain: subdomain } : {}) });
  subdomain = tunnel.clientId;

  console.log(`Hosting at: ${tunnel.url}`);

  tunnel.on('close', () => {
    // tunnels are closed
    console.log('Tunnel closed');
  });

  tunnel.on('request', (info) => {
    console.log(new Date().toString(), info.method, info.path);
  });

  tunnel.on('error', () => {
    // Restart
    startTunnel();
  });
};

const startHttpServer = async () => {
  http
    .createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify({ tunnels: [{ proto: 'http', public_url: tunnel.url }] }));
      res.end();
    })
    .listen(inspectionPort);
};

startTunnel();
startHttpServer();
