const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const html = require('./src/config/html.json');

const options = { html: { default: { title: 'Fusebit' } } };

for (const path in html) {
  let title = 'Fusebit';
  const pathHtml = html[path];
  const meta = [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'Fusebit' },
    { property: 'og:locale', content: 'en' },
    { property: 'og:url', content: `https://fusebit.io${path === 'default' ? '/' : path}` },
    { name: 'twitter:site', content: '@fusebitio' },
    { name: 'twitter:creator', content: '@fusebitio' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ];
  if (pathHtml.image) {
    meta.push({ property: 'og:image', content: pathHtml.image });
    meta.push({ property: 'og:image:secure_url', content: pathHtml.image });
    meta.push({ name: 'twitter:image:src', content: pathHtml.image });
    meta.push({ name: 'twitter:image:width', content: '1024' });
    meta.push({ name: 'twitter:image:height', content: '512' });
  }

  options.html[path] = { title, meta };
}

module.exports = webpackDev(packageJson, options);
