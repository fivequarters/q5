#!/usr/bin/env bash

# Example command line:
# $ DEPLOYMENT_NAME=test1 REGION=us-west-2 tool/cicd/actions/scripts/deploy_exclusive_function_api.sh
#
# Deploys a new stack, promotes, and removes all other stacks from the specified deployment.

# -- Standard Header --
set -e

echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- Parameter Validation --
if [ -z "${DEPLOYMENT_NAME}" ]; then
  echoerr "ERROR: DEPLOYMENT_NAME is unset."
  exit -1
fi

if [ -z "${REGION}" ]; then
  echoerr "ERROR: REGION is unset."
  exit -1
fi

if [ -z "${NETWORK_NAME}" ]; then
  echoerr "ERROR: NETWORK_NAME is unset."
  exit -1
fi

if [ -z "${DEPLOYMENT_DOMAIN}" ]; then
  echoerr "ERROR: NETWORK_NAME is unset."
  exit -1
fi

# -- Optional Parameters --
# Pin to a specific version
IMG_VER=${VERSION_FUNCTION_API:=`jq -r '.version' ./package.json`}

# Is there an environment file present?
if [ -z ${ENV_FILE+x} ]; then
  if [ -f "./gc_bq.env" ]; then
    ENV_PARAMS="--env ./gc_bq.env"
  fi
else
  ENV_PARAMS="--env ${ENV_FILE}"
fi

# -- Script --
${FUSEOPS} setup -c false
${FUSEOPS} deployment add ${DEPLOYMENT_NAME} ${NETWORK_NAME} ${DEPLOYMENT_DOMAIN} --dataWarehouse false --size 1 --region us-east-2 -c false

ALL_STACKS=`${FUSEOPS} stack ls -o json --deployment ${DEPLOYMENT_NAME}`
OLD_STACKS=`echo ${ALL_STACKS} | jq --arg region ${REGION} -r 'map(select(.region == $region)) | .[] | .id'`

echoerr "Deploying stack ${DEPLOYMENT_NAME}/${REGION}: ${IMG_VER} with environment params: ${ENV_PARAMS}"

STACK_ADD_PARAMS="--region ${REGION} -c false -o json ${ENV_PARAMS}"
STACK_ADD=`${FUSEOPS} stack add ${DEPLOYMENT_NAME} ${IMG_VER} ${STACK_ADD_PARAMS}`
NEW_STACK_ID=`echo ${STACK_ADD} | jq -r '.id'`

echoerr "Promoting stack ${DEPLOYMENT_NAME}: ${NEW_STACK_ID}"
${FUSEOPS} stack promote ${DEPLOYMENT_NAME} ${NEW_STACK_ID} --region ${REGION} -c f 1>&2

echoerr "Deleting old stacks: ${OLD_STACKS}"
echo -n ${OLD_STACKS} | \
  xargs -d ' ' -I STACKID \
  ${FUSEOPS} stack rm ${DEPLOYMENT_NAME} STACKID --force true -c f --region ${REGION} -o json 1>&2

echoerr "Completed successfully:"
echo { \"deployment\": \"${DEPLOYMENT_NAME}\", \"id\": \"${NEW_STACK_ID}\" }
