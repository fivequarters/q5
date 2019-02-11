const { webpack } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
module.exports = webpack(packageJson);
