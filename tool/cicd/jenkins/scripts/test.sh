#!/usr/bin/env bash

# Set bash env
set -x

# Run tests
cd api/function-api

# FUSE_PROFILE=cicd EC2=1 yarn test -i --no-colors --outputFile testOutput.json --json | true

# Get logs
<<<<<<< HEAD
export JENKINS_STACK_ADD_TIME=$(cat /tmp/jenkins_start_time)
../../tool/cicd/jenkins/scripts/get_log_stream.js
=======
pwd
./tool/cicd/jenkins/scripts/get_log_stream.js
>>>>>>> acb010d8 (.)
