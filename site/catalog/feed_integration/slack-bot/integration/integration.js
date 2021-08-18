// Fusebit Slack Integration
//
// Create a simple bot to communicate about events in your product with your customers, over their very own
// Slack.  This template shows you how easy it is to create your very own Fusebit Integration and use the
// official Slack SDK - without any of the work!
//
// After reading through this integration, you will be able to create an integration, enable your customers to
// approve it for use in their Slack workspaces, and send messages to your customers based on events that
// happen in your infrastructure or elsewhere on your product.
//
// Learn more about Fusebit Integrations at: https://developer.fusebit.io/docs/integration-programming-model

const { Integration } = require('@fusebit-int/framework');

const integration = new Integration();

// Fusebit leverages the very popular Router concept, as used by both Express and KoaJS.
const router = integration.router;

// Allow only authorized clients (such as your backend) to send a test message to a tenant.
router.post('/api/tenant/:tenantId/test', integration.middleware.authorizeUser('instance:get'), async (ctx) => {
  // Create an official Slack SDK instance, already authorized with the tenant's credentials
  const slackClient = await integration.tenant.getSdkByTenant(ctx, 'slackConnector', ctx.params.tenantId);

  // Send a message! Try replacing the text and the channel name with something different :)
  const result = await slackClient.chat.postMessage({
    text: 'Hello world from Fusebit!',
    channel: '#general',
  });

  ctx.body = result;
});

// Instead of sending a message, list all of the active users and return that information to the caller.
router.get('/api/tenant/:tenantId/users', integration.middleware.authorizeUser('instance:get'), async (ctx) => {
  const slackClient = await integration.tenant.getSdkByTenant(ctx, 'slackConnector', ctx.params.tenantId);

  const result = await slackClient.users.list();

  ctx.body = result;
});

module.exports = integration;
