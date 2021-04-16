module.exports = {
  // Placeholders
  mountUrl: 'https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector',
  callbackUrl: 'https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector' + '/callback',

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
};
