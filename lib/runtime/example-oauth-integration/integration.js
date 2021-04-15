const FusebitRouter = require("@fusebit-int/pkg-manager").default;

const integrate = require("@fusebit-int/pkg-manager").FusebitIntegration;
const router = new FusebitRouter();

router.get("/hello/:tenantId", async (ctx) => {
  const slack = integrate.getByName(ctx, "slack", ctx.param.tenantId);
  await slack.sendMessage("hello world");
  ctx.body = "Hello World!";
});

module.exports = router;
