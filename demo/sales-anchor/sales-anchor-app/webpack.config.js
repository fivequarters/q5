const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');

const options = {
  externals: { '@5qtrs/flexd-editor': 'flexd' },
  globalObject: 'this',
  html: {
    scripts: [
      'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jquery-resize/1.1/jquery.ba-resize.min.js',
      'js/flexd-editor.js',
    ],
  },
};

module.exports = webpackDev(packageJson, options);
