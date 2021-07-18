const { Router } = require("@fusebit-int/pkg-manager");

const router = new Router();

router.get("/api/", async (ctx) => {
  ctx.body = "Hello World";
});

router.get("/api/sdkHealth", async (ctx) => {
  let response = await ctx.state.manager.sdk.integration.dispatch(
    "sdk-test",
    "get",
    "/api/"
  );
  ctx.body = `Proxied response: ${response.body.toString()}`;
});

module.exports = router;
