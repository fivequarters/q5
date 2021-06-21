#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }

# -- Script --

export VERSION_FUNCTION_API=`jq -r '.version' ./package.json`
echo "::set-output name=version-function-api::${VERSION_FUNCTION_API}"
echo "VERSION_FUNCTION_API=${VERSION_FUNCTION_API}" >> $GITHUB_ENV
export VERSION_FUSEBIT_CLI=`jq -r '.version' ./cli/fusebit-cli/package.json`
echo "::set-output name=version-fusebit-cli::${VERSION_FUSEBIT_CLI}"
echo "VERSION_FUSEBIT_CLI=${VERSION_FUSEBIT_CLI}" >> $GITHUB_ENV
export VERSION_FUSEBIT_OPS_CLI=`jq -r '.version' ./cli/fusebit-ops-cli/package.json`
echo "::set-output name=version-fusebit-ops-cli::${VERSION_FUSEBIT_OPS_CLI}"
echo "VERSION_FUSEBIT_OPS_CLI=${VERSION_FUSEBIT_OPS_CLI}" >> $GITHUB_ENV

CUR_HEAD=`git log -1 --format='%H'`
echo "Tags in the current head ${CUR_HEAD}: "
git tag --points-at ${CUR_HEAD}

VER_WART=testtag
VERSION=1.2.4
git tag --points-at HEAD | grep ${VER_WART}-${VERSION} > /dev/null
TAG_TEST=$?
if [ ${TAG_TEST} -ne 0 ]; then
  echoerr "Not publishing ${VERSION} - HEAD is not tagged ${VER_WART}-${VERSION}"
  git tag --points-at HEAD
else
  echoerr "Publishing ${VERSION}"
fi

git tag --points-at ${CUR_HEAD} | grep ${VER_WART}-${VERSION} > /dev/null
TAG_TEST=$?
if [ ${TAG_TEST} -ne 0 ]; then
  echoerr "Not publishing ${VERSION} - HEAD is not tagged ${VER_WART}-${VERSION}"
  git tag --points-at HEAD
else
  echoerr "Publishing ${VERSION}"
fi

echoerr "Versions: function_api/${VERSION_FUNCTION_API} fuse-cli/${VERSION_FUSEBIT_CLI} fuse-ops/${VERSION_FUSEBIT_OPS_CLI}"
echo { \
  \"function_api\": \"${VERSION_FUNCTION_API}\", \
  \"fuse-cli\": \"${VERSION_FUSEBIT_CLI}\",      \
  \"fuse-ops\": \"${VERSION_FUSEBIT_OPS_CLI}\"   \
}

