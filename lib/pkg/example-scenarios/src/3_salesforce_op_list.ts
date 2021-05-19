import Fusebit from '@fusebit-int/pkg-manager';

const router = new Fusebit.Router();

router.get('/health/:tenantId', async (ctx) => {
  const salesforce = await Fusebit.Connectors.GetClient('salesforce', tenantId);

  try {
    const me = await salesforce.me();

    ctx.body = { status: 200 };
  } catch (e) {
    ctx.body = { status: 501 };
  }
});

router.cron('default-schedule', async (ctx) => {
  const tenants = await Fusebit.Storage.get('/tenants');
  const queue = await Fusebit.Queues.GetQueue('tenant-opportunity-update');

  // Every interval, update all of the tenants at the rate determined by the queue configuration.
  await Promise.all(tenants.map((tenant) => queue.postEvent(tenant)));
});

router.queue('tenant-update', async (ctx) => {
  const tenantId = ctx.body;
  const salesforce = await Fusebit.Connectors.GetClient('salesforce', tenantId);

  // Get the timestamp for the last poll of the Salesforce Opportunities.
  const { timestamp } = await Fusebit.Storage.get(`/last-query/${tenantId}`);

  const opportunities = salesforce.getOpportunities({ since: timestamp });

  await Fusebit.Storage.set(`/last-query/${tenantId}`, { timestamp });

  // Send the new opportunities to the service.
  await http.post('https://contoso/update').send(opportunities);
});

export default router;
