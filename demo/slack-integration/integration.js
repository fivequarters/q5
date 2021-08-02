const Integration = require("@fusebit-int/integration");

const integration = new Integration();
const router = integration.router;

router.get("/api", async (ctx) => {
  ctx.body = "Slack integration example works!";
});

router.post("/api/message/:identityId", async (ctx) => {
  const identityId = ctx.params.identityId;
  const message = ctx.req.body?.message;

  if (!message) {
    ctx.throw(400, "Expected message");
  }

  const slackConnector = await integration.service.getByName(
    "slack1",
    (ctx) => identityId
  )(ctx);

  if (!slackConnector) {
    ctx.throw(400, "Expected slack connector");
  }

  await slackConnector.slackClient.chat.postMessage({
    text: message,
    channel: "example-slack-connector-v2",
  });

  ctx.status = 201;
});
module.exports = integration;
