const { Integration } = require('@fusebit-int/framework');
const { v4: uuidv4 } = require('uuid');
const integration = new Integration();

// Koa Router: https://koajs.com/
const router = integration.router;
const connectorName = 'slackConnector';

const OPS_REPORT_CHANNEL = 'ops-report';

integration.middleware.session(router);

router.post('/api/tenant/:tenantId/start', async (ctx) => {
  const slackClient = await integration.tenant.getSdkByTenant(ctx, connectorName, ctx.params.tenantId);

  const result = await slackClient.chat.postMessage({
    text: `${ctx.req.body.userId}/${ctx.req.body.account}$ *fuse-ops@${
      ctx.req.body.version || 'LEGACY_FUSEOPS_PLEASE_UPDATE'
    } ${ctx.req.body.command}*`,
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
