const { webpack } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const scripts = [
  'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jquery-resize/1.1/jquery.ba-resize.min.js',
  'js/q5.min.js',

  // 'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/popper.min.js',
];
module.exports = webpack(packageJson, scripts);
