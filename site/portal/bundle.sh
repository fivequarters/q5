#!/usr/bin/env bash

# Creates one deployment package for the module and function builder Lambdas

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR/build
rm -f portal.zip

set -e

zip -qdgds 1m -r ./portal.zip *
ls -al ./portal.zip
