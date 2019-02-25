const { webpackProd } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const options = {
  hash: true,
  html: {
    title: '<App Title>',
    meta: [{ name: 'description', content: '<Enter a Description>' }],
  },
};

module.exports = webpackProd(packageJson, options);
