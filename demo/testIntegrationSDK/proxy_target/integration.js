const { Router } = require("@fusebit-int/framework");

const router = new Router();

router.get("/api/health", async (ctx) => {
  console.log("hello?");
  ctx.body = "Hello World";
});

router.get("/api/sdkHealth", async (ctx) => {
  console.log(ctx.state.manager.toString());

  let response = await ctx.state.manager.sdk.integration.dispatch(
    "sdk-test",
    "get",
    "/api/health"
  );
  ctx.body = `Proxied response: ${JSON.stringify(response)}`;
});

module.exports = router;
