#!/usr/bin/env bash

# -- Standard Header --
echoerr() { printf "%s\n" "$*" >&2; }
export FUSEBIT_DEBUG=

# -- Optional Parameters --
AWS_PROFILE=${AWS_PROFILE:=default}

# -- Script --
set -e
echoerr "Building package"
yarn bundle fusebit-site

echoerr "Deploying to AWS S3 Bucket"
aws --profile=${AWS_PROFILE} s3 sync --acl public-read \
  site/fusebit-site/dist	\
  s3://fusebit-io-site
aws --profile=${AWS_PROFILE} s3 cp --acl public-read --cache-control max-age=0 \
  site/fusebit-site/dist/index.html	\
  s3://fusebit-io-site/index.html
