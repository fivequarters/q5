#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }

# -- Script --
echo "Set yarn version: "
yarn set version 1.21.1

echo "Yarn install dependencies: "
yarn --frozen-lockfile install

echo "Run Prettier: "
git ls-tree -r ${GITHUB_REF##*/} --name-only | grep -E \"\\.[tj]?sx?$\" | grep -v assets | xargs -P 1 prettier --write

echo "Check if tree changed"
git diff --exit-code