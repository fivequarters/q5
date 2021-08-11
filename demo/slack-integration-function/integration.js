const { Integration } = require("@fusebit-int/framework");

const integration = new Integration();
const router = integration.router;

router.get("/api/", async (ctx) => {
  ctx.body = "Hello World";
});

router.get("/api/:instanceId/me", async (ctx) => {
  const slackClient = await integration.service.getSdk(
    ctx,
    "conn1",
    ctx.params.instanceId
  );
  const result = await slackClient.chat.postMessage({
    text: "Hello world!",
    channel: "example-slack-connector-v2",
  });
  ctx.body = result;
});

module.exports = integration;
