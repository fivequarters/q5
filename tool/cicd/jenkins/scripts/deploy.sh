#!/usr/bin/env bash

# Example command line:
# $ DEPLOYMENT_NAME=test1 REGION=us-west-2 tool/cicd/actions/scripts/deploy_exclusive_function_api.sh
#
# Deploys a new stack, promotes, and removes all other stacks from the specified deployment.

# -- Standard Header --
set -e

DEPLOYMENT_NAME=jenkins
REGION=us-east-2
NETWORK_NAME=cicd
DEPLOYMENT_DOMAIN=dev.fusebit.io

echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"

# -- Optional Parameters --
# Pin to a specific version
IMG_VER=${VERSION_FUNCTION_API:=$(jq -r '.version' ./package.json)}

# -- Script --

ALL_STACKS=$(${FUSEOPS} stack ls -o json --deployment ${DEPLOYMENT_NAME})
OLD_STACKS=$(echo ${ALL_STACKS} | jq --arg region ${REGION} -r 'map(select(.region == $region)) | .[] | .id')

echoerr "Deleting old stacks: ${OLD_STACKS}"
echo -n ${OLD_STACKS} |
  xargs -d ' ' -I STACKID \
    ${FUSEOPS} stack rm ${DEPLOYMENT_NAME} STACKID --force true -c f --region ${REGION} -o json 1>&2

${FUSEOPS} setup -c false
${FUSEOPS} deployment add ${DEPLOYMENT_NAME} ${NETWORK_NAME} ${DEPLOYMENT_DOMAIN} --dataWarehouse false --size 1 --region ${REGION} -c false

echoerr "Deploying stack ${DEPLOYMENT_NAME}/${REGION}: ${IMG_VER} with environment params: ${ENV_PARAMS}"

date +%s >/tmp/jenkins_start_time

STACK_ADD_PARAMS="--region ${REGION} -c false --size 1 -o json ${ENV_PARAMS}"
STACK_ADD=$(${FUSEOPS} stack add ${DEPLOYMENT_NAME} ${IMG_VER} ${STACK_ADD_PARAMS})
NEW_STACK_ID=$(echo ${STACK_ADD} | jq -r '.id')

echoerr "Promoting stack ${DEPLOYMENT_NAME}: ${NEW_STACK_ID}"
${FUSEOPS} stack promote ${DEPLOYMENT_NAME} ${NEW_STACK_ID} --region ${REGION} -c f 1>&2

while [[ "$(curl -s -o /dev/null -w ''%{http_code}'' https://${DEPLOYMENT_NAME}.${REGION}.${DEPLOYMENT_DOMAIN}/v1/health)" != "200" ]]; do sleep 1; done

echoerr "Completed successfully:"
echo { \"deployment\": \"${DEPLOYMENT_NAME}\", \"id\": \"${NEW_STACK_ID}\" }
