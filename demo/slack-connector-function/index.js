const config = {
  handler: "@fusebit-int/slack-connector",
  configuration: {
    scope: "chat:write",
    package: "@fusebit-int/slack-connector",
    clientId: "457394426995.2306221278340",
    clientSecret: "9db6ce41367c3c4d8eeee4fac05de659",
    refreshErrorLimit: 100000,
    refreshInitialBackoff: 100000,
    refreshWaitCountLimit: 100000,
    refreshBackoffIncrement: 100000,
    accessTokenExpirationBuffer: 500,
  },
  mountUrl:
    "/v2/account/acc-21a4974efd574f87/subscription/sub-eeae7b111e9c4285/integration/slack-connector",
};
let handler = "@fusebit-int/slack-connector";
handler = handler[0] === "." ? `${__dirname}/${handler}` : handler;
module.exports = require("@fusebit-int/framework").Handler(handler, config);
