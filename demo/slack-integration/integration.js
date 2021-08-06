const { Integration } = require("@fusebit-int/framework");

const integration = new Integration();
const router = integration.router;

router.get(
  "/api/",
  integration.middleware.authorizeUser("instance:put"),
  async (ctx) => {
    ctx.body = "Hello World";

    const html = integration.response.createJsonForm();
  }
);

router.get("/api/:tenantId/me", async (ctx) => {
  const slackClient = await integration.service.getSdk(
    ctx,
    "conn1",
    ctx.params.tenantId
  );
  const result = await slackClient.chat.postMessage({
    text: "Hello world!",
    channel: "example-slack-connector-v2",
  });
  ctx.body = result;
});

module.exports = integration;
