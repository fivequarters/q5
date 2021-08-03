#!/bin/bash
set -e
export FUSEBIT_DEBUG=1

FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
${FUSEOPS} registry setMaster cicd acc-657e7fe7f3044b91 @fusebit-int --region us-east-2

cd lib/pkg

FUSE="node ../../cli/fusebit-cli/libc/index.js"
${FUSE} profile set cicd
${FUSE} npm login
for pkgPath in framework ./pkg-* ./slack-*; do
  pkgName=$(basename $pkgPath)
  cd ${pkgName};
  yarn build;
  npm publish;
  cd ..
done

${FUSE} profile set cicd

cd ../..
