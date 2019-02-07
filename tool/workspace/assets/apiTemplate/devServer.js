const Api = require('./lib').default;
const packageJson = require('./package.json');

const port = (process.env.PORT = packageJson.devServer.port);

async function start() {
  const server = await Api.create('local');
  server.start();

  console.log(`\n\nListening at http://localhost:${port}\n\n`);
}

start();
