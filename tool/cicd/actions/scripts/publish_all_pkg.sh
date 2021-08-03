#!/bin/bash
set -e

cd lib/pkg

FUSE="node ../../cli/fusebit-cli/libc/index.js"
${FUSE} npm login
for pkgPath in framework ./pkg-* ./slack-*; do
  pkgName=$(basename $pkgPath)
  cd ${pkgName};
  yarn build;
  npm publish;
  cd ..
done

cd ../..
