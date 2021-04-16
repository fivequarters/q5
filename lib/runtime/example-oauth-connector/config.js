module.exports = (ctx) => ({
  // Placeholders
  mountUrl: ctx.baseUrl,
  callbackUrl: ctx.baseUrl + '/callback',

  // OAuth configuration elements
  authorizationUrl: 'https://oauth.mocklab.io/oauth/authorize',
  tokenUrl: 'https://oauth.mocklab.io/oauth/token',
  scope: 'email',
  clientId: 'mocklab_oauth2',
  clientSecret: 'whatever',
  accessTokenExpirationBuffer: 500,
  refreshErrorLimit: 100000,
  refreshWaitCountLimit: 100000,
  refreshInitialBackoff: 100000,
  refreshBackoffIncrement: 100000,
});
