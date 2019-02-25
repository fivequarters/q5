const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');

const options = {
  externals: { q5: 'q5' },
  globalObject: 'this',
  html: {
    scripts: [
      'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jquery-resize/1.1/jquery.ba-resize.min.js',
      'js/q5.min.js',
    ],
  },
};

module.exports = webpackDev(packageJson, options);
