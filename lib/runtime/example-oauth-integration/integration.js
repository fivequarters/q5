const FusebitRouter = require('@fusebit-int/pkg-manager').default;

const connectors = require('@fusebit-int/pkg-manager').connectors;
const router = new FusebitRouter();

const oauth1 = connectors.getByName('oauth1', (ctx) => ctx.params.tenantId);

router.get('/hello/:tenantId', async (ctx) => {
  try {
    const oauth = await oauth1(ctx);
    const result = await oauth.sendMessage('hello world');
    ctx.body = `Hello World - ${result}`;
  } catch (e) {
    ctx.body = `Unable to acquire oauth token - reconfigure?`;
    ctx.status = 500;
  }
});

router.get('/goodbye/:tenantId', async (ctx) => {
  const oauth = await oauth1(ctx);
  await oauth.sendMessage('goodbye cruel world');
  ctx.body = 'So long!';
});

router.use(async (ctx, next) => {
  ctx.state.oauth = await oauth1(ctx);
  return next();
});

router.get('/thing/:tenantId', async (ctx) => {
  ctx.state.oauth.sendMessage('doing the thing!');
  ctx.body = 'done things';
});

module.exports = router;
