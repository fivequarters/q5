const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
module.exports = webpackDev(packageJson);
