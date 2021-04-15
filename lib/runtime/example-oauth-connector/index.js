const FusebitManager = require("@fusebit-int/pkg-manager").FusebitManager;
const { memStorage, storage } = require("./memstorage");

const router = require("@fusebit-int/pkg-oauth-connector").default;

module.exports = async (ctx) => {
  const mockCfg = {
    // Placeholders
    mountUrl: ctx.baseUrl,
    callbackUrl: ctx.baseUrl + "/callback",

    // OAuth configuration elements
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
