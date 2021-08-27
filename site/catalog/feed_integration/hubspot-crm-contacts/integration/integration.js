// Fusebit HubSpot Integration
//
// Interact with HubSpot Contacts in your customer's HubSpot instance. This template
// shows you how easy it is to create your very own Fusebit Integration and use the official HubSpot
// SDK - without any of the work!
//
// Learn more about Fusebit Integrations at:
// https://developer.fusebit.io/docs/integration-programming-model

const { Integration } = require('@fusebit-int/framework');

const integration = new Integration();

// Fusebit leverages the very popular Router concept, as used by both Express and KoaJS.
const router = integration.router;

// Allow only authorized clients (such as your backend) to list all HubSpot CRM Contacts
router.post('/api/tenant/:tenantId/test', integration.middleware.authorizeUser('instance:get'), async (ctx) => {
  // Create an official HubSpot client instance, already authorized with the tenant's credentials
  const hubspotClient = await integration.tenant.getSdkByTenant(ctx, 'hubspotConnector', ctx.params.tenantId);

  const contacts = await hubspotClient.crm.contacts.getAll();

  ctx.body = `Successfully loaded ${contacts.length} Contacts from HubSpot`;
});

module.exports = integration;
