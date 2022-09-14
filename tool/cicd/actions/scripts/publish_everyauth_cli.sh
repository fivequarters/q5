#!/usr/bin/env bash

# -- Standard Header --
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- Optional Parameters --
AWS_PROFILE=${AWS_PROFILE:=default}
VERSION=${VERSION_FUSEBIT_CLI:=`jq -r '.version' ./cli/fusebit-cli/package.json`}

# -- Is this the HEAD of this artifact?
VER_WART=cli
git tag --points-at HEAD | grep ${VER_WART}-${VERSION} > /dev/null
TAG_TEST=$?
if [ ${TAG_TEST} -ne 0 ]; then
  echoerr "Not publishing ${VERSION} - HEAD is not tagged ${VER_WART}-${VERSION}"
  git tag --points-at HEAD
  exit 0;
else
  echoerr "Publishing EveryAuth ${VERSION}"
fi

# -- Script --
set -ea

rm -rf cli/fusebit-cli/package
echoerr "Changing packageAs"

contents="$(jq '.packageAs = "@fusebit/everyauth-cli"' cli/fusebit-cli/package.json)" && echo "${contents}" > cli/fusebit-cli/package.json
contents="$(jq '.bin = { "everyauth": "libc/index.js" }' cli/fusebit-cli/package.json)" && echo "${contents}" > cli/fusebit-cli/package.json

echoerr "Copying README"
cp cli/fusebit-cli/README-EVERYAUTH.md cli/fusebit-cli/README.md

echoerr "Copying mode"
cp cli/fusebit-cli/src/mode_everyauth.ts cli/fusebit-cli/src/mode.ts

echoerr "Rebuilding"
yarn build

echoerr "Building package"
yarn package fusebit-cli 1>&2

echoerr "Deploying to npm (ignoring error on republish of same version)"
cd cli/fusebit-cli/package
npm publish 1>&2 || true

echoerr "Testing installation"
npm install -g @fusebit/everyauth-cli@${VERSION} 1>&2

fuse version 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
