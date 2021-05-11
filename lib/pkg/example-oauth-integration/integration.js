const { Router, Manager, Form } = require('@fusebit-int/pkg-manager');

const connectors = require('@fusebit-int/pkg-manager').connectors;
const router = new Router();

const oauth1 = connectors.getByName('oauth1', (ctx) => ctx.params.tenantId);

const FormSchema = JSON.parse(require('fs').readFileSync(__dirname + '/schema.json', { encoding: 'utf8' }));
const FormUiSchema = JSON.parse(require('fs').readFileSync(__dirname + '/uischema.json', { encoding: 'utf8' }));
const FormData = JSON.parse(require('fs').readFileSync(__dirname + '/data.json', { encoding: 'utf8' }));

router.get('/', async (ctx) => {
  ctx.body = 'Hello World';
});

router.get('/exampleForm/', async (ctx) => {
  const [form, contentType] = Form({
    ...{ schema: undefined, uiSchema: undefined, data: FormData },
    state: ctx.req.body,
    dialogTitle: 'Example Form',
    windowTitle: 'Example Window Title',
    submitUrl: 'submit',
    cancelUrl: 'https://www.google.com',
  });
  ctx.body = form;
  ctx.response.set('Content-Type', contentType);
});

router.post('/exampleForm/submit', async (ctx) => {
  // Call backend with secret here.
  ctx.body = `Success: ${JSON.stringify(ctx.req.body, null, 2)}`;
});

router.get('/hello/:tenantId', async (ctx) => {
  try {
    const oauth = await oauth1(ctx);

    // Example usage with Asana
    const Asana = require('asana');
    const asana = await Asana.Client.create().useOauth({ credentials: oauth.accessToken });
    ctx.body = await asana.users.me();
  } catch (e) {
    ctx.body = `Unable to acquire oauth token - reconfigure? - ${e}`;
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
  const Asana = require('asana');
  const asana = await Asana.Client.create().useOauth({ credentials: ctx.state.oauth.accessToken });
  ctx.body = await asana.users.me();
  ctx.body = 'done things';
});

module.exports = router;
