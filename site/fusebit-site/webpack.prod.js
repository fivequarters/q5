const { webpackProd } = require('@5qtrs/tool-config');
const packageJson = require('./package.json');
const html = require('./src/config/html.json');

const options = {
  hash: true,
  html: {
    default: {
      title: 'Fusebit',
      headSnippet:
        '<style>.async-hide { opacity: 0 !important}</style>' +
        "<script>(function(a,s,y,n,c,h,i,d,e){s.className+=' '+y;h.start=1*new Date;h.end=i=function(){s.className=s.className.replace(RegExp(' ?'+y),'')};(a[n]=a[n]||[]).hide=h;setTimeout(function(){i();h.end=null},c);h.timeout=c;})(window,document.documentElement,'async-hide','dataLayer',4000,{'OPT-KBDMH9D':true});</script>" +
        '<script src="https://www.googleoptimize.com/optimize.js?id=OPT-KBDMH9D"></script>' +
        '<script>' +
        'window.dataLayer = window.dataLayer || [];\n' +
        'if (MutationObserver) {\n' +
        '  const createObserver = () => {\n' +
        '    if (document.body instanceof HTMLElement) {\n' +
        '      new MutationObserver(function () {\n' +
        "        dataLayer.push({ event: 'optimize.activate' });\n" +
        '      }).observe(document.body, { subtree: true, attributes: true, characterData: true });\n' +
        '    } else {\n' +
        '      setTimeout(createObserver, 500);\n' +
        '    }\n' +
        '  };\n' +
        '  createObserver();\n' +
        '}' +
        '</script>',
      bodySnippet: `<!-- Twitter universal website tag code -->
        <script>
        !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
        },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='//static.ads-twitter.com/uwt.js',
        a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
        // Insert Twitter Pixel ID and Standard Event data below
        twq('init','o662d');
        twq('track','PageView');
        </script>
        <!-- End Twitter universal website tag code -->`,
    },
  },
};

for (const path in html) {
  let title = 'Fusebit';
  const pathHtml = html[path];
  const meta = [
    { property: 'og:title', content: 'Fusebit: a powerful integration platform built for developers' },
    {
      property: 'og:description',
      content:
        'With Fusebit, quickly integrate your application to other SaaS applications using flexible API building blocks. Fusebit provides connectors to popular APIs and hosts your integrations at scale.',
    },
    { property: 'twitter:title', content: 'Fusebit: a powerful integration platform built for developers' },
    {
      property: 'twitter:description',
      content:
        'With Fusebit, quickly integrate your application to other SaaS applications using flexible API building blocks. Fusebit provides connectors to popular APIs and hosts your integrations at scale.',
    },
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

module.exports = webpackProd(packageJson, options);
