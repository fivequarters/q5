const { Router } = require("@fusebit-int/framework");

const router = new Router();

router.get("/api/health", async (ctx) => {
  console.log("hello?2");
  ctx.body = { test: "Hello World" };
});

router.get("/api/sdkHealth", async (ctx) => {
  console.log(ctx.state.manager.toString());

  let response = await ctx.state.manager.sdk.integration.dispatch(
    "sdk-test",
    "get",
    "/api/health"
  );
  console.log(response);
  ctx.body = response.body;
});

router.get("/api/fetchInteg", async (ctx) => {
  let response = await ctx.state.manager.sdk.integration.get("sdk-test");
  ctx.body = response.body;
});
router.get("/api/sdkGetInt", async (ctx) => {
  console.log("in sdkGetInt");
  let response = await ctx.state.manager.sdk.integration.get("sdk-test");
  ctx.body = `Proxied response: ${response.body.toString()}`;
});

module.exports = router;
