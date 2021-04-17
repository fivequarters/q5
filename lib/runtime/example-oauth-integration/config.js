module.exports = {
  package: './integration',
  connectors: {
    oauth1: {
      package: '@fusebit-int/pkg-oauth-integration',
      config: {
        authority: 'https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector',
      },
    },
  },
};
