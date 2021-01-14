#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- Optional Parameters --
AWS_PROFILE=${AWS_PROFILE:=default}
VERSION=${VERSION_FUSEBIT_CLI:=`jq -r '.version' ./cli/fusebit-cli/package.json`}

# -- Script --
echoerr "Building package"
rm -rf cli/fusebit-cli/package
yarn package fusebit-cli 1>&2

echoerr "Deploying to npm (ignoring error on republish of same version)"
cd cli/fusebit-cli/package
npm publish 1>&2 || true

echoerr "Testing installation"
npm install -g @fusebit/cli@${VERSION} 1>&2

fuse version 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
