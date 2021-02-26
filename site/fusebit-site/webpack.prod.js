const { webpackProd } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const html = require('./html.json');

const options = {
  hash: true,
  html: {},
};

for (const path in html) {
  const pathHtml = html[path];
  const meta = [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'Fusebit' },
    { property: 'og:locale', content: 'en' },
    { property: 'og:url', content: `https://fusebit.io${path === 'default' ? '/' : path}` },
    { name: 'twitter:site', content: '@fusebitio' },
    { name: 'twitter:creator', content: '@fusebitio' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'google-site-verification', content: 'ZeI3rI_zbytkLXohJFwqU0MWHagv2oSkczYi8UoHK2I' },
  ];
  if (pathHtml.title) {
    meta.push({ property: 'og:title', content: pathHtml.title });
    meta.push({ name: 'twitter:title', content: pathHtml.title });
  }
  if (pathHtml.description) {
    meta.push({ name: 'description', content: pathHtml.description });
    meta.push({ property: 'og:description', content: pathHtml.description });
    meta.push({ name: 'twitter:description', content: pathHtml.description });
  }
  if (pathHtml.image) {
    meta.push({ property: 'og:image', content: pathHtml.image });
    meta.push({ property: 'og:image:secure_url', content: pathHtml.image });
    meta.push({ name: 'twitter:image:src', content: pathHtml.image });
    meta.push({ name: 'twitter:image:width', content: '1024' });
    meta.push({ name: 'twitter:image:height', content: '512' });
  }

  options.html[path] = { title: 'Fusebit', meta };
}

module.exports = webpackProd(packageJson, options);
