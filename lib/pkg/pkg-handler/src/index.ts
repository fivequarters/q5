import { Manager } from '@fusebit-int/pkg-manager';
import { storage } from './fusebitstorage';

module.exports = (config: any) => {
  const manager = new Manager(storage); // Start the manager with a pseudo-storage

  let router;
  let routerError;
  try {
    router = require(config.package);
  } catch (e) {
    routerError = e;
  }

  manager.setup(config, router, routerError); // Configure the system.

  return async (ctx: any) => {
    let result;
    try {
      result = await manager.handle(ctx);
    } catch (error) {
      console.log(`ERROR: `, error);
      return { body: { config, error, result, ctx } };
    }

    return result;
  };
};
