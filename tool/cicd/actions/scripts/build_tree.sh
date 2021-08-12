#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }

npm i -g @fusebit/cli
fuse profile ls
./tool/cicd/actions/scripts/publish_proxy_secrets.sh

# -- Script --
echoerr "Setting yarn version:"
yarn set version 1.21.1

echoerr "yarn setup:"
yarn --frozen-lockfile setup

echoerr "yarn install:"
yarn --frozen-lockfile install

echoerr "yarn build:"
yarn build

echoerr "Validate tests all build:"
cd api/function-api
EC2=1 LAMBDA_USER_FUNCTION_PERMISSIONLESS_ROLE=1 yarn test --no-cache --forceExit --testNamePattern=DoesNotMatchAnyTests
