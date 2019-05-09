#!/usr/bin/env bash

# Creates the Lambda deployment package for the data warehouse export logic

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

set -e
mkdir -p dist
rm -rf dist/*
mkdir -p libc/node_modules
rm -rf libc/node_modules/*
cp package.json libc/
npm install --no-package-lock --prod --prefix ./libc 
rm -f libc/package.json
cd libc
zip -r ../dist/dwh_export.zip node_modules *.js
cd ..
rm -rf libc/node_modules
ls -al dist/dwh_export.zip