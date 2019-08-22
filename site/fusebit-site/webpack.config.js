const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const options = { html: { default: { title: 'Fusebit' } } };
module.exports = webpackDev(packageJson, options);
