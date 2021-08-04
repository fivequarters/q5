const config = {
  handler: "./integration",
  configuration: {},
  components: [
    {
      name: "slack1",
      package: "@fusebit-int/slack-integration",
      entityType: "connector",
      entityId: "slack-connector",
      dependsOn: [],
      skip: false,
      path: "/api/authorize",
    },
  ],
  componentTags: {},
  mountUrl:
    "/v2/account/acc-21a4974efd574f87/subscription/sub-eeae7b111e9c4285/integration/slack-integration",
};
let handler = "./integration";
handler = handler[0] === "." ? `${__dirname}/${handler}` : handler;
module.exports = require("@fusebit-int/framework").Handler(handler, config);
