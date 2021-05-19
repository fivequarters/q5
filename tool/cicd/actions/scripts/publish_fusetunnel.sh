#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- cloning fusetunnel --
git clone https://github.com/fusebit/tunnel

# -- Optional Parameters --
AWS_PROFILE=${AWS_PROFILE:=default}
VERSION=${VERSION_FUSEBIT_CLI:=`jq -r '.version' ./tunnel/package.json`}

echoerr "Deploying to npm (ignoring error on republish of same version)"
cd tunnel/
npm publish 1>&2 || true

echoerr "Testing installation"
npm install -g @fusebit/tunnel@${VERSION} 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
