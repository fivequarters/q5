const FusebitRouter = require('@fusebit-int/pkg-manager').default;
const Fusebit = require('@fusebit-int/pkg-manager');

const connectors = require('@fusebit-int/pkg-manager').connectors;
const router = new FusebitRouter();

const oauth1 = connectors.getByName('oauth1', (ctx) => ctx.params.tenantId);

const NameForm = {
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3, description: 'Please enter your name' },
      vegetarian: { type: 'boolean' },
      birthDate: { type: 'string', format: 'date' },
    },
  },
  uiSchema: {
    type: 'HorizontalLayout',
    elements: [
      { type: 'Control', label: 'Name', scope: '#/properties/name' },
      { type: 'Control', label: 'Birth Date', scope: '#/properties/birthDate' },
    ],
  },
  data: { name: 'John Doe' },
};

router.get('/exampleForm/', async (ctx) => {
  console.log(Fusebit.Form);
  const [form, contentType] = Fusebit.Form({
    ...NameForm,
    state: ctx.req.body,
    submitUrl: 'submit',
    cancelUrl: 'https://www.google.com',
  });
  ctx.body = form;
  ctx.response.set('Content-Type', contentType);
});

router.post('/exampleForm/submit', async (ctx) => {
  ctx.body = 'Success!';
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
