const Integration = require("@fusebit-int/integration");

const integration = new Integration();
const router = integration.router;

integration.router.post("/api/:tenantId/message", async (ctx) => {
  const message = ctx.req.body?.message;
  if (!message) {
    ctx.throw(400, "Expected message");
  }

  const WebClient = await integration.service.getSDK(ctx, "slack1");
  if (!WebClient) {
    ctx.throw(400, "Expected slack connector");
  }

  const instances = integration.service.listTenantInstances(ctx);

  await Promise.all(
    instances.map(async (instance) => {
      await WebClient.chat.postMessage({
        text: message,
        channel: "example-slack-connector-v2",
        userId: (instance) => string,
      });
    })
  );

  ctx.body = { message: "success" };
});

router.get("/api/test", (ctx) => (ctx.body = "working?"));
module.exports = integration;
