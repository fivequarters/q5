const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const options = { html: { title: 'Fusebit' } };
module.exports = webpackDev(packageJson, options);
