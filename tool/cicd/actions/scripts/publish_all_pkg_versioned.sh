#!/bin/bash
set -x

cd lib/pkg

FUSE="node ../../cli/fusebit-cli/libc/index.js"

PACKAGE_FILES=`find . -name node_modules -prune -false -o -name package.json`;
BASEDIR=`pwd`
for fuseProfile in selfservice.api.us-west-1.internal stage.us-west-2.internal; do
  ${FUSE} profile set ${fuseProfile}
  ${FUSE} npm login
  for pkgPath in ${PACKAGE_FILES}; do
    dirName=$(dirname $pkgPath)
    cd ${dirName};
    echo BUILDING ${dirName}
    VERSION=`jq -rc ".version" package.json`
    dirName=$(dirname $pkgPath)
    pkgName="$(basename -- $dirName)"

    git tag --points-at HEAD | grep ${pkgName}-${VERSION} > /dev/null
    TAG_TEST=$?
    if [ ${TAG_TEST} -ne 0 ]; then
      echoerr "Not publishing ${VERSION} - HEAD is not tagged ${pkgName}-${VERSION}"
      git tag --points-at HEAD
      continue
    else
        echoerr "Publishing ${VERSION}"
    fi
    yarn build;
    npm publish;
    cd ${BASEDIR}
  done
done
cd ../..
