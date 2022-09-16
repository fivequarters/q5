#!/usr/bin/env bash

# -- Standard Header --
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- Optional Parameters --
VERSION=${VERSION_FUSEBIT_OPS_CLI:=`jq -r '.version' ./cli/fusebit-ops-cli/package.json`}

# -- Parameters --
AWS_S3_OPTS="--acl public-read --cache-control max-age=300"
MAJOR_MINOR=`echo ${VERSION} | sed 's/\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\)/\1.\2/'`

# -- Is this the HEAD of this artifact?
VER_WART=ops-cli
git tag --points-at HEAD | grep ${VER_WART}-${VERSION} > /dev/null
TAG_TEST=$?
if [ ${TAG_TEST} -ne 0 ]; then
  echoerr "Not publishing ${VERSION} - HEAD is not tagged ${VER_WART}-${VERSION}"
  git tag --points-at HEAD
  exit 0;
else
  echoerr "Publishing ${VERSION}"
fi

# -- Script --
set -e
echoerr "Creating fusebit-ops-cli package: ${VERSION} at ${MAJOR_MINOR}"
rm -rf cli/fusebit-ops-cli/package
yarn package fusebit-ops-cli 1>&2

echoerr "Creating fusebit-ops-cli npm tgz"
cd cli/fusebit-ops-cli/package
npm pack 1>&2

echoerr "Publishing to fusebit-ops-cli to S3"
aws s3 cp ${AWS_S3_OPTS} --content-type application/gzip \
  fusebit-ops-cli-${VERSION}.tgz	\
  s3://fusebit-io-cdn/fusebit/cli/fusebit-ops-cli-v${MAJOR_MINOR}.tgz 1>&2

aws s3 cp ${AWS_S3_OPTS} --content-type application/gzip \
  fusebit-ops-cli-${VERSION}.tgz	\
  s3://fusebit-io-cdn/fusebit/cli/fusebit-ops-cli-v${VERSION}.tgz 1>&2

aws s3 cp ${AWS_S3_OPTS} --content-type application/gzip \
  fusebit-ops-cli-${VERSION}.tgz \
  s3://fusebit-io-cdn/fusebit/cli/fusebit-ops-cli-latest.tgz 1>&2

echoerr "Validating package is accessible and installable"
npm -g i https://cdn.fusebit.io/fusebit/cli/fusebit-ops-cli-v${MAJOR_MINOR}.tgz 1>&2

fuse-ops version 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
