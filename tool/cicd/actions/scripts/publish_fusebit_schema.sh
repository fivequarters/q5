#!/usr/bin/env bash

# -- Standard Header --
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- Optional Parameters --
AWS_PROFILE=${AWS_PROFILE:=default}
VERSION=${VERSION_FUSEBIT_CLI:=`jq -r '.version' ./lib/data/schema/package.json`}

# -- Is this the HEAD of this artifact?
VER_WART=schema
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
echoerr "Deploying to npm (ignoring error on republish of same version)"
cd lib/data/schema/
npm publish 1>&2 || true

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
