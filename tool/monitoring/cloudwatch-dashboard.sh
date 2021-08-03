#!/usr/bin/env bash

AWS_REGION=$1

MYDIR="$(dirname "$(which "$0")")"

cat $MYDIR/cloudwatch-dashboard-template.json | sed 's/AWS_REGION/'$AWS_REGION'/g'
