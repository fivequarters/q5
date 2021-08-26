// Fusebit Hubspot Integration
//
// Interact with Hubspot CRM contacts over your customers very own Hubspot instance.  This template
// shows you how easy it is to create your very own Fusebit Integration and use the official Hubspot
// SDK - without any of the work!
//
// After reading through this integration, you will be able to create an integration, enable your
// customers to approve it for use in their Hubspot account, and access their Hubspot CRM contacts.
// You can use these valuable information to interact with your product.
//
// Learn more about Fusebit Integrations at:
// https://developer.fusebit.io/docs/integration-programming-model

const { Integration } = require('@fusebit-int/framework');

const integration = new Integration();

// Fusebit leverages the very popular Router concept, as used by both Express and KoaJS.
const router = integration.router;

// Allow only authorized clients (such as your backend) to list all Hubspot CRM Contacts
router.post('/api/tenant/:tenantId/test', integration.middleware.authorizeUser('instance:get'), async (ctx) => {
  // Create an official Hubspot client instance, already authorized with the tenant's credentials
  const hubspotClient = await integration.tenant.getSdkByTenant(ctx, 'hubspotConnector', ctx.params.tenantId);

  const contacts = await hubspotClient.crm.contacts.getAll();

  ctx.body = contacts;
});

module.exports = integration;
