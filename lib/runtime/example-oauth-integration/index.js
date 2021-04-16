const FusebitManager = require('@fusebit-int/pkg-manager').FusebitManager;
const { memStorage, storage } = require('./memstorage');

const config = require('./config');

const manager = new FusebitManager(storage); // Start the manager with a pseudo-storage

let router;
let routerError;
try {
  router = require('./integration');
} catch (e) {
  routerError = e;
}

manager.setup(config, router, routerError); // Configure the system.

const fcm = require('@fusebit-int/pkg-manager').connectors;
console.log(`XXX ${JSON.stringify(config)} ${router} ${routerError} ${require('util').inspect(fcm)}`);

module.exports = async (ctx) => {
  let result;
  console.log(`XXX ${JSON.stringify(config)} ${router} ${routerError}`);
  try {
    result = await manager.handle(ctx);
  } catch (error) {
    return { body: { config, memStorage, error, result, ctx } };
  }
  return { body: { result, memStorage, ctx } };
};
