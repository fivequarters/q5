#!/bin/bash
set -e

LAMBDAS="analytics cron dwh"
CURDIR=${PWD}

# Make sure all of the lambdas are fully built
cd ../../..
for lambda in ${LAMBDAS}; do
  yarn build lambda-${lambda}
done

# Build this package
cd ${CURDIR}
tsc -b

# Make sure the symlinks are present in libc for packaging.
for lambda in ${LAMBDAS};do
  ln -sf ../../lambda-${lambda}/libc/lambda-${lambda}.zip libc/
done
