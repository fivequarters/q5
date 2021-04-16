const FusebitManager = require('@fusebit-int/pkg-manager').FusebitManager;
const { memStorage, storage } = require('./memstorage');

const router = require('@fusebit-int/pkg-oauth-connector').default;

module.exports = async (ctx) => {
  const config = require('./config')(ctx);

  const manager = new FusebitManager(storage); // Start the manager with a pseudo-storage
  manager.setup(config, router, undefined); // Configure the system.

  let result;
  try {
    result = await manager.handle(ctx);
  } catch (error) {
    return { body: { memStorage, error, result, ctx } };
  }
  return { body: { result, memStorage, ctx } };
};
