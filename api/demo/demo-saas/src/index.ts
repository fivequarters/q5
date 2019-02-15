import { Api } from './Api';
export { Api as default } from './Api';

async function start() {
  const server = await Api.create('production');
  server.start();
}

if (!module.parent) {
  start();
}
