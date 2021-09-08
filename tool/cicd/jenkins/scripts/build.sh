#!/usr/bin/env bash

# bash envs
set -x

# Install dependencies and build tree

yarn

yarn setup

yarn build

# build docker image

yarn image