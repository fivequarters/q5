const { Router } = require('@fusebit-int/framework');
const superagent = require('superagent');

const router = new Router();

router.get('/api/message/:identityId', async (ctx) => {
  const identityId = ctx.params.identityId;
  const connectorBaseUrl = ctx.state.params.baseUrl.replace(/integration/g, 'connector');

  const connectorUrl = `${connectorBaseUrl}/api/${identityId}/token`;

  const { access_token } = (await superagent.get(connectorUrl)).body;

  ctx.status = 200;
  ctx.body = access_token;
});

router.get('/api/', async (ctx) => {
  ctx.body =
    [
      ` ____  _   _  ____ ____ _____ ____ ____`,
      `/ ___|| | | |/ ___/ ___| ____/ ___/ ___|`,
      `\\___ \\| | | | |  | |   |  _| \\___ \\___ \\`,
      ` ___) | |_| | |__| |___| |___ ___) |__) |`,
      `|____/ \\___/ \\____\\____|_____|____/____/`,
    ].join('\n') +
    `\n\nSuccessfully completed the session initalization for ${ctx.query.session}\n\n` +
    `At this point, the user would be redirected back to the backend url, which would perform an authenticated call\n` +
    `to persist the configuration session to the database.`;
});

module.exports = router;
