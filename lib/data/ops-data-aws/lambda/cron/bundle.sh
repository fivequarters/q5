#!/usr/bin/env bash

# Creates one deployment package for the cron scheduler and executor Lambda functions

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

set -e
mkdir -p ../../libc
rm -f ../../libc/cron.zip
mkdir -p libc/node_modules
rm -rf libc/node_modules/*

# Install any dependencies for this package
cp package.json libc/
npm install --no-package-lock --prod --prefix ./libc 
rm -f libc/package.json

# Copy any misc js files from src into the libc
for jsfile in `cd src && find . -name *.js`; do
  mkdir -p libc/$(dirname "${jsfile}")
  cp src/${jsfile} libc/${jsfile}
  echo Copying: ${jsfile}
done

# Create the zip file for AWS
cd libc
zip -qdgds 1m -r ../../../libc/cron.zip node_modules `find . -name \*.js | grep -v node_modules`

# Show the results
cd ..
rm -rf libc/node_modules
unzip -l ../../libc/cron.zip | grep -v node_modules
