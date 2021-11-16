#!/usr/bin/env bash

./tool/cicd/actions/scripts/set_fuse_profile.sh FUSE_PROFILE_INTERNAL_321_US_WEST_2_STAGE;
node cli/fusebit-cli/libc/index.js function ls
