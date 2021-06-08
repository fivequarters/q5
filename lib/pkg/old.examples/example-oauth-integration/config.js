module.exports = {
  package: './integration',
  connectors: {
    oauth1: {
      package: '@fusebit-int/pkg-oauth-integration',
      config: {
        authority: 'https://stage.us-west-2.fusebit.io/v1/run/sub-ed9d9341ea356841/benn/oauth-connector',
      },
    },
  },
};
