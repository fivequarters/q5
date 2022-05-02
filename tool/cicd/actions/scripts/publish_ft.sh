#!/usr/bin/env bash

set -ex

# -- cloning fusetunnel --
git clone https://github.com/fusebit/tunnel-server

VERSION=${VERSION_FUSEBIT_CLI:=$(jq -r '.version' ./tunnel-server/package.json)}

echoerr "Deploying to npm (ignoring error on republish of same version)"
cd tunnel-server/
npm publish 1>&2 || true

echoerr "Testing installation"
npm install -g @fusebit/tunnel-server@${VERSION} 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }

# -- cloning fusetunnel --
git clone https://github.com/fusebit/tunnel

VERSION=${VERSION_FUSEBIT_CLI:=$(jq -r '.version' ./tunnel/package.json)}

echoerr "Deploying to npm (ignoring error on republish of same version)"
cd tunnel/
npm publish 1>&2 || true

echoerr "Testing installation"
npm install -g @fusebit/tunnel@${VERSION} 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
