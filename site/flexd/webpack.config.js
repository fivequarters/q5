const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const options = { html: { title: 'Flexd' } };
module.exports = webpackDev(packageJson, options);
