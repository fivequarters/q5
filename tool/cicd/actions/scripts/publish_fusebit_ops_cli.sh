#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- Optional Parameters --
AWS_PROFILE=${AWS_PROFILE:=default}
VERSION=${VERSION_FUSEBIT_OPS_CLI:=`jq -r '.version' ./cli/fusebit-ops-cli/package.json`}

# -- Script --
MAJOR_MINOR=`echo ${VERSION} | sed 's/\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\)/\1.\2/'`
echoerr "Creating fusebit-ops-cli package: ${VERSION} at ${MAJOR_MINOR}"
rm -rf cli/fusebit-ops-cli/package
yarn package fusebit-ops-cli 1>&2

echoerr "Creating fusebit-ops-cli npm tgz"
cd cli/fusebit-ops-cli/package
npm pack 1>&2

echoerr "Publishing to fusebit-ops-cli to S3"
aws --profile=${AWS_PROFILE} s3 cp \
  --acl public-read --content-type application/gzip --cache-control max-age=300 \
  fusebit-ops-cli-${VERSION}.tgz	\
  s3://fusebit-io-cdn/fusebit/cli/fusebit-ops-cli-v${MAJOR_MINOR}.tgz 1>&2

echoerr "Validating package is accessible and installable"
npm -g i https://cdn.fusebit.io/fusebit/cli/fusebit-ops-cli-v${MAJOR_MINOR}.tgz 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
