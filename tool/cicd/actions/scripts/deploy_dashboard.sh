#!/bin/zsh

# -- Standard Header --
echoerr() { printf "%s\n" "$*" >&2; }
export FUSEBIT_DEBUG=

# -- Optional Parameters --
AWS_PROFILE=${AWS_PROFILE:=default}

# -- Script --
set -e
echoerr "Deploying dashboard to ${DASHBOARD_REGION}/${DASHBOARD_NAME} for ${DASHBOARD_DEPLOYMENT} to ${REGION}"

DASHBOARD_BODY=$(cat $DASHBOARD | sed 's/AWS_REGION/'$DASHBOARD_REGION'/g' | sed 's/DEPLOYMENT_NAME/'$DASHBOARD_DEPLOYMENT'/g' | jq -c)

aws cloudwatch --profile=${AWS_PROFILE} --region=${REGION} put-dashboard --dashboard-name $DASHBOARD_NAME \
    --dashboard-body $DASHBOARD_BODY
