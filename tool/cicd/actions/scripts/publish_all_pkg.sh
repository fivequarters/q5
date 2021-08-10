#!/bin/bash
set -e

cd lib/pkg

FUSE="node ../../cli/fusebit-cli/libc/index.js"
${FUSE} npm login

PACKAGE_FILES=`find . -name node_modules -prune -false -o -name package.json`;
BASEDIR=`pwd`

for pkgPath in ${PACKAGE_FILES}; do
  dirName=$(dirname $pkgPath)
  cd ${dirName};
  echo BUILDING ${dirName}
  yarn build;
  npm publish;
  cd ${BASEDIR}
done

cd ../..
