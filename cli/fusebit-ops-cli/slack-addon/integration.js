const { Integration } = require('@fusebit-int/framework');
const { v4: uuidv4 } = require('uuid');
const integration = new Integration();

// Koa Router: https://koajs.com/
const router = integration.router;
const connectorName = 'slackConnector';

const OPS_REPORT_CHANNEL = 'ops-report';

integration.middleware.session(router);

// Test Endpoint: Send a Direct Message to the Slack user associated with your tenant.
router.post('/api/tenant/:tenantId/test', integration.middleware.authorizeUser('install:get'), async (ctx) => {
  // API Reference: https://developer.fusebit.io/reference/fusebit-int-framework-integration
  const slackClient = await integration.tenant.getSdkByTenant(ctx, connectorName, ctx.params.tenantId);

  // API Reference: https://slack.dev/node-slack-sdk/web-api
  const slackUserId = slackClient.fusebit.credentials.authed_user.id;

  const result = await slackClient.chat.postMessage({
    text: 'Hello world from Fusebit!',
    channel: slackUserId,
  });

  ctx.body = { message: `Success! Sent a message to Slack user ${slackUserId}!` };
});

router.post('/api/tenant/:tenantId/start', async (ctx) => {
  const slackClient = await integration.tenant.getSdkByTenant(ctx, connectorName, ctx.params.tenantId);

  const result = await slackClient.chat.postMessage({
    text: `${ctx.req.body.userId}/${ctx.req.body.account} ran fuse-ops ${ctx.req.body.command}`,
    channel: 'ops-report',
  });
  ctx.body = {
    ts: result.ts,
  };
});

router.post('/api/tenant/:tenantId/ts/:ts/sendMessage', async (ctx) => {
  const slackClient = await integration.tenant.getSdkByTenant(ctx, connectorName, ctx.params.tenantId);
  for (const message of ctx.req.body.messages) {
    const result = await slackClient.chat.postMessage({
      text: message,
      thread_ts: parseFloat(ctx.params.ts),
      channel: 'ops-report',
    });
  }
});

module.exports = integration;
