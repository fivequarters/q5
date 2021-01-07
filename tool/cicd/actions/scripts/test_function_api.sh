#!/usr/bin/env bash

# -- Standard Header --
set -e

cd api/function-api
export FUSE_PROFILE=`echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.user.profileName'`
EC2=1 yarn test --testPathIgnorePatterns test/cron test/npm
