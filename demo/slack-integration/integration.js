const { Integration } = require("@fusebit-int/framework");

const integration = new Integration();
const router = integration.router;

router.post("/api/:tenantId/sendMessage", async (ctx) => {
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

router.get("/api/:tenantId/users", async (ctx) => {
  console.log("hit path: " + ctx.params.tenantId);
  const slackClient = await integration.service.getSdk(
    ctx,
    "conn1",
    ctx.params.tenantId
  );

  const result = await slackClient.users.identity();
  ctx.body = result;
});

module.exports = integration;
