#!/usr/bin/env bash

set -ex

# -- cloning fusetunnel --
git clone https://github.com/fusebit/tunnel-server

VERSION=$(jq -r '.version' ./tunnel-server/package.json)

echo "Deploying to npm (ignoring error on republish of same version)"
cd tunnel-server/
npm publish 1>&2 || true

echo "Testing installation"
npm install -g @fusebit/tunnel-server@${VERSION} 1>&2

echo "Completed successfully:"
echo { \"version\": \"${VERSION}\" }

# -- cloning fusetunnel --
git clone https://github.com/fusebit/tunnel

VERSION=$(jq -r '.version' ./tunnel/package.json)

echo "Deploying to npm (ignoring error on republish of same version)"
cd tunnel/
npm publish 1>&2 || true

echo "Testing installation"
npm install -g @fusebit/tunnel@${VERSION} 1>&2

echo "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
