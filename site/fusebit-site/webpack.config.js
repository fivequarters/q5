const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const html = require('./src/html');

const options = { html: { default: { title: 'Fusebit' } } };

for (const path in html) {
  const pathHtml = html[path];
  options.html[path] = { title: pathHtml.title };
}

module.exports = webpackDev(packageJson, options);
