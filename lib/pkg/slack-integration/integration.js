const { Router } = require('@fusebit-int/framework');
const superagent = require("superagent");
const { WebClient } = require('@slack/web-api');


const router = new Router();

router.get('/api/', async (ctx) => {
  ctx.body = 'It works';
});

router.post('/api/message/:identityId', async (ctx) => {
  const identityId = ctx.params.identityId;
  const connectorBaseUrl = ctx.state.params.baseUrl.replace(/integration/g, 'connector');
  const message = ctx.req.body && ctx.req.body.message;

  if(!message) {
    ctx.throw(400,'Expected message');
  }

  const createConnectorUrl = () => {
    return `${connectorBaseUrl}/api/${identityId}/token`;
  };

  const { access_token } = (await superagent.get(createConnectorUrl())).body;

  const web = new WebClient(access_token);
  await web.chat.postMessage({
    text: message,
    channel: 'example-slack-connector-v2',
  });

  ctx.status = 201;
});

router.get("/api/", async (ctx) => {
  ctx.body =
    [
      ` ____  _   _  ____ ____ _____ ____ ____`,
      `/ ___|| | | |/ ___/ ___| ____/ ___/ ___|`,
      `\\___ \\| | | | |  | |   |  _| \\___ \\___ \\`,
      ` ___) | |_| | |__| |___| |___ ___) |__) |`,
      `|____/ \\___/ \\____\\____|_____|____/____/`,
    ].join("\n") +
    `\n\nSuccessfully completed the session initalization for ${ctx.query.session}\n\n` +
    `At this point, the user would be redirected back to the backend url, which would perform an authenticated call\n` +
    `to persist the configuration session to the database.`;
});

router.get("/api/session/:sessionId", async (ctx) => {
  const { tokens, output } = await getTokens(ctx);
  ctx.body = { tokens, output };
});

const getTokens = async (ctx) => {
  const response = await superagent
    .get(`${ctx.state.params.baseUrl}/session/result/${ctx.params.sessionId || ctx.query.session}`)
    .set("Authorization", `Bearer ${ctx.state.params.functionAccessToken}`);

  const connectorUrlArray = ctx.state.params.baseUrl.split("/");
  connectorUrlArray.pop();
  connectorUrlArray.pop();
  connectorUrlArray.push("connector");
  const connectorBaseUrl = connectorUrlArray.join("/");
  const createConnectorUrl = (connectorId, subordinateId) => {
    return `${connectorBaseUrl}/${connectorId}/api/session/${subordinateId}/token`;
  };
  const tokens = {};
  await Promise.all(
    Object.entries(response.body.uses).map(async ([key, value]) => {
      tokens[key] = (await superagent.get(createConnectorUrl(value.componentId, value.subordinateId))).body;
    })
  );
  return { tokens, output: response.body.output };
};

module.exports = router;