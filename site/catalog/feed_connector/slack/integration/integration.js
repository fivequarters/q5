/**
 * Slack Integration
 * Integrate, Deploy and maintain a Slack SDK into your application.
 * You will be using Koa (https://koajs.com/) for writing your integration code, this provides a robust mechanism
 * for writing your API in an elegant way.
 * You can install and use any external dependency from npm according to your integration needs and interact with
 * Fusebit SDK by using @fusebit-int/framework package, already provided as part of this integration.
 *
 * Copyright Fusebit, Inc. All Rights Reserved.
 */

const { Integration } = require('@fusebit-int/framework');

// In order to have access to our SDK methods you need to create a new instance of Integration class.
const integration = new Integration();
// Since you're building an API, you need to expose routes, so your application can determine how to respond
// to client requests to a particular endpoint via HTTP request methods (GET, POST, PUT, DELETE)
const router = integration.router;

// Get some inspiration from the following example endpoints and learn how to use our Slack SDK.

/**
 * Post a message to Slack
 * In this endpoint you will find the following components:
 * 1. Defining a route path: /api/tenant/:tenantId/test
 *    This is a test endpoint using the POST HTTP method, notice the :tenantId parameter
 *    which represents an user from your integration, this can be one of your customers for example.
 *    Read more about tenants concept here <LINK>
 * 2. Protecting your route
 *    The second parameter of the route is the place where you can specify the Middlewares, you can write your
 *    own or use our provided middlewares like the one we're using here for checking authorization of performing this action.
 *    Read more about authorization here https://fusebit.io/docs/integrator-guide/authz-model/#accessing-resources-of-the-fusebit-platform
 */
router.post('/api/tenant/:tenantId/test', integration.middleware.authorizeUser('instance:put'), async (ctx) => {
  /**
   * You can use the Slack SDK by referencing the connector name you provided at the moment of creating the connector.
   * By calling getSdkByTenant different things may happen:
   * 1. The SDK will throw an error if the tenant is not found
   * 2. The SDK will return a slack client ready to use with all the available Slack Web API methods
   * you can review Slack Web API here https://www.npmjs.com/package/@slack/web-api)
   */
  const slackClient = await integration.tenant.getSdkByTenant(ctx, 'slackConnector', ctx.params.tenantId);
  /**
   * Use the Slack Web API to send a message to a specific channel name
   * If posting to slack fails, this may help you to troubleshoot:
   * 1. Ensure you've added the Slack application to the channel you're trying to post.
   * 2. Ensure your connector is properly configured (i.e valid scope, client id, client secret)
   */

  const result = await slackClient.chat.postMessage({
    text: 'Hello world from Fusebit!',
    channel: 'your-channel-name-here',
  });
  // Write the result to the body and send it to the client request.
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
