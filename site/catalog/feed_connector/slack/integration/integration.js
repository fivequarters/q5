const { Integration } = require('@fusebit-int/framework');

const integration = new Integration();
const router = integration.router;

/**
 * Post a message to Slack
 */
router.post('/api/tenant/:tenantId/test', integration.middleware.authorizeUser('instance:put'), async (ctx) => {
  const slackClient = await integration.tenant.getSdkByTenant(ctx, 'slackConnector', ctx.params.tenantId);
  const result = await slackClient.chat.postMessage({
    text: 'Hello world from Fusebit!',
    channel: 'your-channel-name-here',
  });
  ctx.body = result;
});

/**
 * List Slack users
 */
router.get('/api/tenant/:tenantId/users', integration.middleware.authorizeUser('instance:get'), async (ctx) => {
  const slackClient = await integration.tenant.getSdkByTenant(ctx, 'slackConnector', ctx.params.tenantId);
  const result = await slackClient.users.list();
  ctx.body = result;
});

module.exports = integration;
