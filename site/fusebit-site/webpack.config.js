const { webpackDev } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const html = require('./src/config/html.json');

const options = {
  html: {
    default: {
      title: 'Fusebit',
      headSnippet:
        '<style>.async-hide { opacity: 0 !important}</style>' +
        '<script src="https://www.googleoptimize.com/optimize.js?id=OPT-KBDMH9D"></script>' +
        "<script>(function(a,s,y,n,c,h,i,d,e){s.className+=' '+y;h.start=1*new Date;h.end=i=function(){s.className=s.className.replace(RegExp(' ?'+y),'')};(a[n]=a[n]||[]).hide=h;setTimeout(function(){i();h.end=null},c);h.timeout=c;})(window,document.documentElement,'async-hide','dataLayer',4000,{'OPT-KBDMH9D':true});</script>" +
        "<script>window.dataLayer = window.dataLayer || []; if (MutationObserver) { new MutationObserver(function(){ dataLayer.push({'event': 'optimize.activate'}); }).observe(document.body, {subtree: true, attributes: true, characterData: true}); }</script>",
    },
  },
  devServer: {disableHostCheck: true}
};

for (const path in html) {
  let title = 'Fusebit';
  const pathHtml = html[path];
  const meta = [
    { property: 'og:title', content: 'Fusebit: a powerful integration platform built for developers"' },
    { property: 'og:description', content: 'With Fusebit, quickly integrate your application to other SaaS applications using flexible API building blocks. Fusebit provides connectors to popular APIs and hosts your integrations at scale.' },
    { property: 'twitter:title', content: 'Fusebit: a powerful integration platform built for developers"' },
    { property: 'twitter:description', content: 'With Fusebit, quickly integrate your application to other SaaS applications using flexible API building blocks. Fusebit provides connectors to popular APIs and hosts your integrations at scale.' },
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

  options.html[path] = { title, meta, ...options.html[path] };
}

module.exports = webpackDev(packageJson, options);
