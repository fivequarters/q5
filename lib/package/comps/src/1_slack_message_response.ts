import Fusebit from '@fusebit-int/pkg-manager';

const router = new Fusebit.Router();

/*
 * Send a "Hello World!" message to the user configured as 'tenantId'.
 */
router.get('/hello/:tenantId', async (ctx) => {
  /*
  const fusebit = new Fusebit(ctx);

  const instance = await ctx.Fusebit.Integrations.GetInstance(ctx.params.tenantId);
  const identity = await ctx.Fusebit.Connectors.GetIdentity('slack', instance);
  const slack = await ctx.Fusebit.Connectors.GetSdk('slack', identity);
  */
  const slack = await ctx.Fusebit.Connectors.slack1.GetSdk(ctx.params.tenantId);
  const config = await ctx.Fusebit.GetInstanceConfig(ctx);

  await slack.bot.chat.postMessage({ text: `Hello User!`, channel: config.slack_channel_name });

  ctx.body = { status: 'success' };
});

/*
 * A user sent a message to the bot in Slack, which has been already mapped to a particular tenantId.
 */
router.on('slack1.message', async (ctx) => {
  const contoso = await ctx.Fusebit.Connectors.GetClient('contoso', ctx.body.tags.tenantId);
  const config = await ctx.Fusebit.GetInstanceConfig(ctx);

  await contoso.notifyOnSlackMessage(ctx.body.event);

  ctx.body = { status: 'success' };
});

/*
Possibly in the connector.
router.on('slack.unknownUser', async (ctx) => {
});
*/
export default router;
