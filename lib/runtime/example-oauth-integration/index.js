const FusebitManager = require("@fusebit-int/pkg-manager").FusebitManager;
const { memStorage, storage } = require("./memstorage");

const router = require("./integration");

const mockCfg = {
  integration: {
    slack1: {
      package: "@fusebit-int/slack-connector",
      config: {
        authority: "https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector",
      },
    },
  },
};

module.exports = async (ctx) => {
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
