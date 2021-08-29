// Fusebit Linear Integration
//
// Create a simple way to read issues from Linear.
//
// After reading through this integration, you will be able to create an integration, and enable your customers to
// add their Linear instance to read issues from.
//
// Learn more about Fusebit Integrations at: https://developer.fusebit.io/docs/integration-programming-model

const { Integration } = require('@fusebit-int/framework');

const integration = new Integration();

// Fusebit leverages the very popular Router concept, as used by both Express and KoaJS.
const router = integration.router;

// Allow only authorized clients (such as your backend) to send a test message to a tenant.
router.get('/api/tenant/:tenantId/test', integration.middleware.authorizeUser('instance:get'), async (ctx) => {
  // Create an official Linear SDK instance, already authorized with the tenant's credentials
  const linearClient = await integration.tenant.getSdkByTenant(ctx, 'linearConnector', ctx.params.tenantId);

  // Get a list of all of the issues in Linear.
  const issues = await linearClient.issues();

  ctx.body = `Found ${issues.length} issues!`;
});

module.exports = integration;
