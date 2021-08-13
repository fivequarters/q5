const { Integration } = require('@fusebit-int/framework');

const integration = new Integration();
const router = integration.router;

/**
 * Post a message to Slack
 */
router.post('/api/:tenantId/sendMessage', integration.middleware.authorizeUser('instance:put'), async (ctx) => {
  const slackClient = await integration.service.getSdk(ctx, 'slackConnector', ctx.params.tenantId);
  const result = await slackClient.chat.postMessage({
    text: 'Hello world from Fusebit!',
    channel: 'your-channel-name-here',
  });
  ctx.body = result;
});

/**
 * List Slack users
 */
router.get('/api/:tenantId/users', integration.middleware.authorizeUser('instance:get'), async (ctx) => {
  const slackClient = await integration.service.getSdk(ctx, 'slackConnector', ctx.params.tenantId);
  const result = await slackClient.users.identity();
  ctx.body = result;
});

module.exports = integration;
