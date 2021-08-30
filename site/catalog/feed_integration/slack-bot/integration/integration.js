// Fusebit Slack Integration
//
// This simple Slack integration allows you to call Slack APIs on behalf of the tenants of your
// application. Fusebit manages the Slack authorization process and maps tenants of your application
// to their Slack credentials, so that you can focus on implementing the integration logic.
//
// A Fusebit integration is a microservice running on the Fusebit platform.
// You control the endpoints exposed from the microservice. You call those endpoints from your application
// to perform specific tasks on behalf of the tenants of your app.
//
// Learn more about Fusebit Integrations at: https://developer.fusebit.io/docs/integration-programming-model

const { Integration } = require('@fusebit-int/framework');

const integration = new Integration();

// Fusebit uses the KoaJS router to allow you to add custom HTTP endpoints to the integration, which
// you can then call from witin your application.
// For KoaJS programming model, see https://koajs.com/.
const router = integration.router;

// The sample test endpoint of this integration sends a Direct Message to the Slack user associated with your tenant.
router.post('/api/tenant/:tenantId/test', integration.middleware.authorizeUser('instance:get'), async (ctx) => {
  // Create a Slack client pre-configured with credentials necessary to communicate with your tenant's Slack workspace.
  // For the Slack SDK documentation, see https://slack.dev/node-slack-sdk/web-api.
  const slackClient = await integration.tenant.getSdkByTenant(ctx, 'slackConnector', ctx.params.tenantId);

  // Get the Slack user ID associated with your tenant
  const slackUserId = slackClient.fusebit.credentials.authed_user.id;

  // Send a Direct Message to the Slack user
  const result = await slackClient.chat.postMessage({
    text: 'Hello world from Fusebit!',
    channel: slackUserId,
  });

  ctx.body = { message: 'Success sending a message to Slack!' };
});

// This endpoint lists Slack users of the workspace associated with your tenant.
router.get('/api/tenant/:tenantId/users', integration.middleware.authorizeUser('instance:get'), async (ctx) => {
  const slackClient = await integration.tenant.getSdkByTenant(ctx, 'slackConnector', ctx.params.tenantId);

  const result = await slackClient.users.list();

  ctx.body = result;
});

module.exports = integration;
