const { Integration } = require('@fusebit-int/framework');

const integration = new Integration();
const router = integration.router;

router.post('/api/tenant/:tenantId/test', async (ctx) => {
  ctx.body = 'it works!';
});

router.get('/api/tenant/:tenantId/contacts', async (ctx) => {
  const hubspotClient = await integration.tenant.getSdkByTenant(ctx, 'conn1', ctx.params.tenantId);
  const allContacts = await hubspotClient.crm.contacts.getAll();
  ctx.body = allContacts;
});

module.exports = integration;
