#!/usr/bin/env bash

# Set bash env
set -x

# Run tests
cd api/function-api

FUSE_PROFILE=cicd EC2=1 yarn test -i --no-colors --outputFile testOutput.json --json | true

# Get logs
./tool/cicd/jenkins/scripts/get_log_stream.js
