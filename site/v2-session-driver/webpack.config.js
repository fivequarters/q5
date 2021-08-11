const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');

const options = {
  html: {
    default: {
      title: 'Fusebit Integration Session Creator',
    },
  },
  devServer: {
    disableHostCheck: true,
  },
};

module.exports = webpackDev(packageJson, options);
