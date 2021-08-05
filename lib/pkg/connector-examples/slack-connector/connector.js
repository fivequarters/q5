const Connector = require("@fusebit-int/connector");
import { schema, uischema } from "./configure";

const connector = new Connector();
const router = connector.router;

const TOKEN_URL = "https://slack.com/api/oauth.v2.access";
const AUTHORIZATION_URL = "https://slack.com/oauth/v2/authorize";

router.on("startup", async ({ mgr, cfg }, next) => {
  cfg.configuration.tokenUrl = TOKEN_URL;
  cfg.configuration.authorizationUrl = AUTHORIZATION_URL;
  return next();
});

router.get(
  "/api/configure",
  Middleware.authorize("connector:put"),
  async (ctx) => {
    ctx.body = {
      data: ctx.state.manager.config.configuration,
      schema,
      uischema,
    };
  }
);

module.exports = connector;
