const { webpackProd } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const options = {
  entry: 'lambda',
  targetNode: true,
  libraryTarget: 'umd',
  libraryName: 'index',
  noMin: true,
};

module.exports = webpackProd(packageJson, options);
