import Fusebit from '@fusebit-int/pkg-manager';

const router = new Fusebit.Router();

router.post('/:tenantId/new-ticket', async (ctx) => {
  const jira = await Fusebit.Connectors.GetClient('jira', ctx.params.tenantId);
  const ticketId = await jira.createNewTicket(ctx.body);
  await Fusebit.Storage.append('/tickets', { tenantId: ctx.params.tenantId, ticketId });

  ctx.body = { status: 'success' };
});

router.cron('default-schedule', async (ctx) => {
  const tickets = await Fusebit.Storage.get('/tickets');
  const queue = await Fusebit.Queues.GetQueue('ticket-update');

  await Promise.all(tickets.map((ticket) => queue.postEvent(ticket)));

  ctx.body = { status: `updated ${tickets.length} tickets` };
});

router.queue('ticket-update', async (ctx) => {
  const ticket = ctx.body;
  const jira = await Fusebit.Connectors.GetClient('jira', tenantId);
  const throttledQueue = await Fusebit.Queues.GetQueue('ticket-throttled');

  let newTicket;
  try {
    newTicket = await jira.getTicket(ticket.ticketId);
  } catch (e) {
    // Could also DLQ via uncaught exception.
    if (e.statusCode == 429) {
      throttledQueue.postEvent(ctx.body);
    }
    return;
  }

  // Compare

  const response = await http.post(`https://contoso/update/${ticket.tenantId}`).send(ticket);
});

export default router;
