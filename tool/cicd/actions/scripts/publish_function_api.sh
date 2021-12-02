#!/usr/bin/env bash

# -- Standard Header --
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- Optional Parameters --
VERSION=${VERSION_FUNCTION_API:=`jq -r '.version' ./package.json`}

# -- Is this the HEAD of this artifact?
VER_WART=api
git tag --points-at HEAD | grep ${VER_WART}-${VERSION} > /dev/null
TAG_TEST=$?
if [ ${TAG_TEST} -ne 0 ]; then
  echoerr "Not publishing ${VERSION} - HEAD is not tagged ${VER_WART}-${VERSION}"
  git tag --points-at HEAD
  exit 0;
else
  echoerr "Publishing ${VERSION}"
fi

# -- Script --
set -e
for OPS_PROFILE in github-automation.321 github-automation.749 github-automation.763; do
  ${FUSEOPS} profile set ${OPS_PROFILE}
  ${FUSEOPS} image publish ${VERSION} 1>&2
done

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
