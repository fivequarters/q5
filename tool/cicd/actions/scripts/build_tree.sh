#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }

# -- Script --
echoerr "Setting yarn version:"
yarn set version 1.21.1

echoerr "yarn setup:"
yarn --frozen-lockfile setup

echoerr "yarn install:"
yarn --frozen-lockfile install

echoerr "yarn build:"
yarn build
