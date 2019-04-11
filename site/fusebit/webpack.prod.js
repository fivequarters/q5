const { webpackProd } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const options = {
  hash: true,
  html: {
    title: 'Fusebit',
    meta: [
      { name: 'description', content: 'Fusebit. Flexible customizations and integrations of your SaaS.' },
      // { name: 'google-site-verification', content: 'Xsqrjgp5Y9GZRzH9jGGwqQmI0tP-jSVRfUYXX5l4EGc' },
    ],
    // bodySnippet: '<div>my html</div>'
  },
};

module.exports = webpackProd(packageJson, options);
