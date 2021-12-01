#!/usr/bin/env zx

const keys = [
  'CaC5PUXF3swrCxkM5rGOA7oUUGVZv9zH',
  'WSACLqGgP5iDXr3iPDubC70ySHfWHWQk',
  'LZUtOoFkuzwcr8YFCAFPeS8iSWS2bQxU',
  'Bw1onkn50qJulNqAucB57Nyc7K71atgg',
];

(async () => {
  for (const key of keys) {
    await $`wget https://cdn.segment.com/analytics.js/v1/${key}/analytics.min.js`;
    await $`mv analytics.min.js ${key}.js`;
    await $`aws s3 cp --acl public-read --cache-control max-age=300 ${key}.js s3://fusebit-io-cdn/data/js/`;
  }
})();
