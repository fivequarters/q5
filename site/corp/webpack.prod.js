const { webpackProd } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const options = {
  hash: true,
  html: {
    title: 'Five Quarters',
    meta: [
      { name: 'description', content: "Five Quarters. We're making SaaS integrations just work better." },
      { name: 'google-site-verification', content: 'Xsqrjgp5Y9GZRzH9jGGwqQmI0tP-jSVRfUYXX5l4EGc' },
    ],
    bodySnippet: '<div>mydiv</div>',
  },
};

module.exports = webpackProd(packageJson, options);
