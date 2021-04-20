import Fusebit from '@fusebit-int/pkg-manager';

const router = new Fusebit.Router();

/*
 * Send a "Hello World!" message to the user configured as 'tenantId'.
 */
router.get('/hello/:tenantId', async (ctx) => {
  const slack = await Fusebit.Connectors.GetClient('slack', ctx.params.tenantId);

  slack.sendMessage(`Hello User ${ctx.params.tenantId}`);

  ctx.body = { status: 'success' };
});

/*
 * A user sent a message to the bot in Slack, which has been already mapped to a particular tenantId.
 */
router.on('slack.message', async (ctx) => {
  const contoso = await Fusebit.Connectors.GetClient('contoso', ctx.params.tenantId);

  await contoso.notifyOnSlackMessage(ctx.body);

  ctx.body = { status: 'success' };
});

export default router;
