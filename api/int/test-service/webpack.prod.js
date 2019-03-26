const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const options = {
  entry: 'lambda',
  targetNode: true,
  libraryTarget: 'umd',
};

module.exports = webpackDev(packageJson, options);
