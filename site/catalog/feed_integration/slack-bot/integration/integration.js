/**
 * Slack Integration
 * Integrate, Deploy and maintain a Slack SDK into your application.
 * Learn more about integrations at https://developer.fusebit.io/docs/integration-programming-model
 */

const { Integration } = require('@fusebit-int/framework');

/** In order to have access to our SDK methods you need to create a new instance of Integration class.  */
const integration = new Integration();

/**
 * Since you're building an API, you need to expose routes, so your application can determine how to respond
 * to client requests to a particular endpoint via HTTP request methods (GET, POST, PUT, DELETE)
 */
const router = integration.router;

/** Get some inspiration from the following example endpoints and learn how to use the official Slack SDK. */

/**
 * Post a message to Slack
 * In this endpoint you will find the following components:
 * 1. Defining a route path: /api/tenant/:tenantId/test
 *    This is a test endpoint using the POST HTTP method, notice the :tenantId parameter
 *    which represents an user from your integration, this can be one of your customers for example.
 *    Read more about tenants concept here https://developer.fusebit.io/docs/tenants
 * 2. Protecting your route
 *    The second parameter of the route is the place where you can specify the middleware, you can write your
 *    own or use our provided middleware like the one we're using here for checking authorization of performing this action.
 *    Read more about authorization here https://developer.fusebit.io/docs/authorization-model
 */
router.post('/api/tenant/:tenantId/test', integration.middleware.authorizeUser('instance:put'), async (ctx) => {
  /**
   * You can use the Slack SDK by referencing the connector name you provided at the moment of creating the connector.
   * By calling getSdkByTenant you will get a configured Slack web client with all the available Slack Web API methods.
   * Now you just focus on your core application and we will handle the rest from our SDK!
   * All Slack Web API is available here, you can read about them at https://www.npmjs.com/package/@slack/web-api
   */
  const slackClient = await integration.tenant.getSdkByTenant(ctx, 'slackConnector', ctx.params.tenantId);

  /** Use the Slack Web API to send a message to a specific channel name */
  const result = await slackClient.chat.postMessage({
    text: 'Hello world from Fusebit!',
    channel: '<replace-with-channel-name-here>',
  });

  /**
   * Write the result to the body and send it to the client request.
   * This is how you send content back to the browser from this route.
   */
  ctx.body = result;
});

/**
 * List Slack users
 * Following a similar approach from the previous method, you can use the Slack SDK for read operations too.
 */
router.get('/api/tenant/:tenantId/users', integration.middleware.authorizeUser('instance:get'), async (ctx) => {
  const slackClient = await integration.tenant.getSdkByTenant(ctx, 'slackConnector', ctx.params.tenantId);
  const result = await slackClient.users.list();
  ctx.body = result;
});

module.exports = integration;
