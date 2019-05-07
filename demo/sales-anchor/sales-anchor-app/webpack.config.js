const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');

const options = {
  externals: { '@5qtrs/fusebit-editor': 'fusebit' },
  globalObject: 'this',
  html: {
    scripts: [
      // 'js/fusebit-editor.js',
      'https://cdn.fusebit.io/fusebit/js/fusebit-editor/latest/fusebit-editor.js',
    ],
  },
};

module.exports = webpackDev(packageJson, options);
