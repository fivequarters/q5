const { Router, Manager, Form } = require('@fusebit-int/framework');

const router = new Router();

router.get('/api/', async (ctx) => {
  ctx.body = 'Hello World';
});

router.get('/api/:tenantId', async (ctx) => {
  try {
    const oauth = await ctx.state.manager.connectors.getByName('oauth1', (ctx) => ctx.params.tenantId)(ctx);
    // Example usage with Asana
    const Asana = require('asana');
    const asana = await Asana.Client.create().useOauth({ credentials: oauth.accessToken });
    ctx.body = await asana.users.me();
  } catch (e) {
    ctx.body = `Unable to acquire oauth token - reconfigure? - ${e}`;
    ctx.status = 500;
  }
});

module.exports = router;
