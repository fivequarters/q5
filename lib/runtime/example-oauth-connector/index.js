const FusebitManager = require("@fusebit-int/pkg-manager").FusebitManager;

const router = require("@fusebit-int/pkg-oauth-connector").default;

let memStorage = {};

const storage = {
  get: async (key) => memStorage[key],
  put: async (data, key) => {
    memStorage[key] = data;
  },
  delete: async (key, flag) => {
    if (flag) {
      memStorage = {};
    } else if (key) {
      delete memStorage[key];
    }
  },
};

module.exports = async (ctx) => {
  const mockCfg = {
    mountUrl: ctx.baseUrl,
    callbackUrl: ctx.baseUrl + "/callback",

    authorizationUrl: "https://oauth.mocklab.io/oauth/authorize",
    tokenUrl: "https://oauth.mocklab.io/oauth/token",
    scope: "email",
    clientId: "mocklab_oauth2",
    clientSecret: "whatever",
    accessTokenExpirationBuffer: 500,
    refreshErrorLimit: 100000,
    refreshWaitCountLimit: 100000,
    refreshInitialBackoff: 100000,
    refreshBackoffIncrement: 100000,
  };

  const manager = new FusebitManager(storage); // Start the manager with a pseudo-storage
  manager.setup(router, undefined, mockCfg); // Configure the system.

  let result;
  try {
    result = await manager.handle(ctx);
  } catch (error) {
    return { body: { memStorage, error, result, ctx } };
  }
  return { body: { result, memStorage, ctx } };
};
