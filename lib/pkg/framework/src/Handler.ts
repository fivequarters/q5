import { Manager } from './Manager';

export const Handler = (handler: string, config: any) => {
  const manager = new Manager();

  let router;
  let routerError;
  try {
    router = require(handler).router;
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
