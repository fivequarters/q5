const { webpackProd } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const options = {
  hash: true,
  html: {
    title: 'Five Quarters',
    meta: [{ name: 'description', content: "Five Quarters. We're making SaaS integrations just work better." }],
  },
};

module.exports = webpackProd(packageJson, options);
