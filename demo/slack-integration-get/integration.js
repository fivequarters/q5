const { Integration } = require("@fusebit-int/framework");

const integration = new Integration();
const router = integration.router;

router.get("/api/", async (ctx) => {
  ctx.body = "Hello World";
});

router.get("/api/me", async (ctx) => {
  const slackClient = integration.service.getSdk(
    ctx,
    "slack1",
    "slack-integration"
  );
  const me = await slackClient.identity();
  ctx.body = me;
});

module.exports = integration;
