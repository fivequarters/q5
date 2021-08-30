#!/bin/bash
VERSION=`jq -rc ".version" cli/fusebit-ops-cli/package.json`
git tag ops-cli-${VERSION} || true
VERSION=`jq -rc ".version" cli/fusebit-cli/package.json`
git tag cli-${VERSION} || true
VERSION=`jq -rc ".version" package.json`
git tag api-${VERSION} || true
VERSION=`jq -rc ".version" lib/client/fusebit-editor/package.json`
git tag editor-${VERSION} || true
VERSION=`jq -rc ".version" site/portal/package.json`
git tag portal-${VERSION} || true
git push --tags || true

# Tag fusebit-int packages

cd lib/pkg

PACKAGE_FILES=`find . -name node_modules -prune -false -o -name package.json`;
BASEDIR=`pwd`

for pkgPath in ${PACKAGE_FILES}; do
  VERSION=`jq -rc ".version" ${pkgPath}`
  dirName=$(dirname $pkgPath)
  cd ${dirName};
  echo BUILDING ${dirName}
  pkgVersion=`jq -rc ".version" package.json`
  pkgName="$(basename -- $dirName)"
  git tag ${pkgName}-${pkgVersion} || true
  git push --tags || true
done

cd ../..