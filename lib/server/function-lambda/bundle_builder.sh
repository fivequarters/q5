#!/usr/bin/env bash

# Creates one deployment package for the module and function builder Lambdas

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

set -e

mkdir -p libc
rm -rf libc/builder.zip
mkdir -p lambda/builder/node_modules
rm -rf lambda/builder/node_modules/*
cd lambda/builder
npm install --no-package-lock --prod --prefix ./
zip -qdgds 1m -r ../../libc/builder.zip node_modules *.js zip libbz2.so.1
cd $DIR
ls -al libc/builder.zip
