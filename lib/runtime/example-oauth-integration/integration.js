const FusebitRouter = require('@fusebit-int/pkg-manager').default;

const connectors = require('@fusebit-int/pkg-manager').FusebitConnectors;
const router = new FusebitRouter();

const slack1 = connectors.getByName('slack1', (ctx) => ctx.param.tenantId);

router.get('/hello/:tenantId', async (ctx) => {
  const slack = await slack1.instantiate(ctx);
  await slack.sendMessage('hello world');
  ctx.body = 'Hello World!';
});

router.get('/goodbye/:tenantId', async (ctx) => {
  const slack = await slack1.instantiate(ctx);
  await slack.sendMessage('goodbye cruel world');
  ctx.body = 'So long!';
});

router.use(async (ctx, next) => {
  ctx.state.slack = await slack1.instantiate(ctx);
  return next();
});

router.get('/thing/:tenantId', async (ctx) => {
  ctx.state.slack.sendMessage('doing the thing!');
  ctx.body = 'done things';
});

module.exports = router;
