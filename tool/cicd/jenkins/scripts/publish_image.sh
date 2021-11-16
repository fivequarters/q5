#!/usr/bin/env bash

# Set bash envs
set -x

# Set Fusebit envs
FUSEBIT_DEBUG=1
FUSEOPS_CLI='node cli/fusebit-ops-cli/libc/index.js'
API_VERSION=$(cat package.json | jq -r .version)

# Publish the image
$FUSEOPS_CLI image publish $API_VERSION
