const http = require('http');
const localtunnel = require('localtunnel');

const serverPort = 3001;
const inspectionPort = 4040;

(async () => {
  const tunnel = await localtunnel({ port: serverPort });

  console.log(`Hosting at: ${tunnel.url}`);

  http
    .createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify({ tunnels: [{ proto: 'http', public_url: tunnel.url }] }));
      res.end();
    })
    .listen(inspectionPort);

  tunnel.on('close', () => {
    // tunnels are closed
    console.log('Tunnel closed');
  });

  tunnel.on('request', (info) => {
    console.log(new Date().toString(), info.method, info.path);
  });
})();
