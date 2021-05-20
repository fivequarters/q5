#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- cloning fusetunnel --
git clone https://github.com/fusebit/tunnel

AWS_PROFILE=${AWS_PROFILE:=default}
TUNNEL_VERSION=$(jq -r '.version' ./tunnel/package.json)

echoerr "Deploying to npm (ignoring error on republish of same version)"
cd tunnel/
npm publish --access public 1>&2 || true

echoerr "Testing installation"
npm install -g @fusebit/tunnel@${TUNNEL_VERSION} 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${TUNNEL_VERSION}\" }
