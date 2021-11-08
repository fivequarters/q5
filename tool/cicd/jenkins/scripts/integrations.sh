#!/usr/bin/env bash

set -e

# Download lerna and zx
npm install -g zx
npm install -g lerna

# Download the repo
git clone git@github.com:fusebit/integrations

cd integrations
npm i
lerna bootstrap
lerna run build

./scripts/e2e-test/e2e.mjs
