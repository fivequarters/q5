#!/usr/bin/env bash

# Set bash env
set -x

# Run tests
cd api/function-api

FUSE_PROFILE=cicd EC2=1 yarn test --outputFile testOutput.json --json | true
