module.exports = (ctx) => ({
  integration: {
    slack1: {
      package: '@fusebit-int/slack-connector',
      config: {
        authority: 'https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector',
      },
    },
  },
});
