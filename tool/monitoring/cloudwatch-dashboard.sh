#!/usr/bin/env bash

DEPLOYMENT_NAME=$1
AWS_REGION=$2

SCRIPT_DIR="$(dirname "$(which "$0")")"

cat $SCRIPT_DIR/cloudwatch-dashboard-template.json | sed 's/AWS_REGION/'$AWS_REGION'/g' | sed 's/DEPLOYMENT_NAME/'$DEPLOYMENT_NAME'/g'
