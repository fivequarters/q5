#!/usr/bin/env bash

# -- Standard Header --
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- Optional Parameters --
VERSION=${VERSION_FUNCTION_API:=`jq -r '.version' ./package.json`}

# -- Script --
set -e

${FUSEOPS} image publish ${VERSION} 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
