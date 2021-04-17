const FusebitManager = require('@fusebit-int/pkg-manager').FusebitManager;
const { memStorage, storage } = require('./memstorage');

const config = require('./config');

const manager = new FusebitManager(storage); // Start the manager with a pseudo-storage

let router;
let routerError;
try {
  router = require(config.package);
} catch (e) {
  routerError = e;
}

manager.setup(config, router, routerError); // Configure the system.

module.exports = async (ctx) => {
  let result;
  try {
    result = await manager.handle(ctx);
  } catch (error) {
    return { body: { config, error, result, ctx } };
  }
  return result;
};
