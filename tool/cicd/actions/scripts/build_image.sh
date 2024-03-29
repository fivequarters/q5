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
  echoerr "Not building ${VERSION} - HEAD is not tagged ${VER_WART}-${VERSION}"
  git tag --points-at HEAD
  exit 0;
else
  echoerr "Building ${VERSION}"
fi

yarn image
