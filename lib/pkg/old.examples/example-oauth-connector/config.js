module.exports = {
  // Placeholders
  mountUrl: 'https://stage.us-west-2.fusebit.io/v1/run/sub-ed9d9341ea356841/benn/oauth-connector',
  callbackUrl: 'https://stage.us-west-2.fusebit.io/v1/run/sub-ed9d9341ea356841/benn/oauth-connector' + '/callback',
  package: '@fusebit-int/pkg-oauth-connector',

  // OAuth configuration elements
  authorizationUrl: 'https://app.asana.com/-/oauth_authorize',
  tokenUrl: 'https://app.asana.com/-/oauth_token',
  scope: '',
  clientId: '1199616699105101',
  clientSecret: '270181f1379d9c7578e4624567d09a92',
  accessTokenExpirationBuffer: 500,
  refreshErrorLimit: 100000,
  refreshWaitCountLimit: 100000,
  refreshInitialBackoff: 100000,
  refreshBackoffIncrement: 100000,
};
