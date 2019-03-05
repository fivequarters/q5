#!/usr/bin/env bash

# Creates one deployment package for the cron scheduler and executor Lambda functions

set -e
mkdir -p dist
rm -rf dist/*
mkdir -p libc/node_modules
rm -rf libc/node_modules/*
cp package.json libc/
npm install --no-package-lock --prod --prefix ./libc 
rm -f libc/package.json
cd libc
zip -r ../dist/cron.zip node_modules *.js
cd ..
rm -rf libc/node_modules
ls -al dist/cron.zip