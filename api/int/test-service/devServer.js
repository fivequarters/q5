require('dotenv').config();

const Service = require('./libc').default;
const packageJson = require('./package.json');

const port = (process.env.PORT = packageJson.devServer.port);

async function start() {
  const server = await Service.create('local', port);
  server.start();

  console.log(`\n\nListening at http://localhost:${port}\n\n`);
}

start();
