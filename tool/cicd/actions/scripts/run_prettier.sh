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
npx prettier '*/**/*.{js,ts,tsx}' --write

echo "Check if tree changed"
git diff --exit-code