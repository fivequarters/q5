#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- Optional Parameters --
IMG_VER=${VERSION_FUNCTION_API:=`jq -r '.version' ./package.json`}

# -- Script --
${FUSEOPS} image publish ${IMG_VER} 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${IMG_VER}\" }
