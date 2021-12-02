#!/usr/bin/env bash

# -- Standard Header --
echoerr() { printf "%s\n" "$*" >&2; }

# -- Script --
cd api/function-api && yarn doc
aws s3 cp --acl public-read --content-type text/html --cache-control max-age=300 ./index.html s3://fusebit-io-site/docs/reference/fusebit-http-api/index.html

echoerr "Completed successfully:"
