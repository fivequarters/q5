#!/usr/bin/env bash

# Creates portal deployment package for uploading to CDN

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR/build
rm -f portal.zip

set -e

zip -qdgds 1m -r ./portal.zip *
ls -al ./portal.zip
