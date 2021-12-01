#!/usr/bin/env bash

# Set bash env
set -x

# Run tests
cd api/function-api

FUSE_PROFILE=cicd EC2=1 yarn test -i --no-colors --outputFile testOutput.json --json test/v1/function.staticip.test.ts | true

# Get logs
export JENKINS_STACK_ADD_TIME=$(cat /tmp/jenkins_start_time)
../../tool/cicd/jenkins/scripts/get_log_stream.js
