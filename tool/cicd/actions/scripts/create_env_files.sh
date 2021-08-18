#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }

HOMEDIR=${HOMEDIR:=~}

# -- Script --
echoerr "Creating api/function-api/.env"
DOTENV=api/function-api/.env

mkdir -p api/function-api
echo DEPLOYMENT_KEY=stage > ${DOTENV}.template
echo AWS_REGION=us-west-2 >> ${DOTENV}.template
echo API_SERVER=https://stage.us-west-2.fusebit.io >> ${DOTENV}.template
echo > ${DOTENV}.bootstrap

echoerr "Creating ${HOMEDIR}/.fusebit profile"
mkdir -p ${HOMEDIR}/.fusebit
echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.user.settings' > ${HOMEDIR}/.fusebit/settings.json

for KEYFILE in `echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.user.keys | keys[]'`; do
  mkdir -p $(dirname ${HOMEDIR}/.fusebit/${KEYFILE})
  export KEYFILE
  echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.user.keys[env.KEYFILE]' > ${HOMEDIR}/.fusebit/${KEYFILE}
done

echoerr "Creating ${HOMEDIR}/.fusebit-ops profile"
mkdir -p ${HOMEDIR}/.fusebit-ops

OPS_PROFILE_NAME=`echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.ops.profileName'`
OPS_PROFILE=`echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.ops.settings.profiles["'${OPS_PROFILE_NAME}'"]'`
echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.ops.settings' > ${HOMEDIR}/.fusebit-ops/settings.json

echoerr "Creating ${HOMEDIR}/.aws/config"
mkdir -p ${HOMEDIR}/.aws
echo "[default]" > ${HOMEDIR}/.aws/config
echo "region = us-west-2" >> ${HOMEDIR}/.aws/config

echoerr "Creating ${HOMEDIR}/.aws/credentials"
echo "[default]" > ${HOMEDIR}/.aws/credentials
echo "aws_access_key_id = `echo ${OPS_PROFILE} | jq -r '.awsAccessKeyId'`" >> ${HOMEDIR}/.aws/credentials
echo "aws_secret_access_key = `echo ${OPS_PROFILE} | jq -r '.awsSecretAccessKey'`" >> ${HOMEDIR}/.aws/credentials

echoerr "Creating ${HOMEDIR}/.npmrc"
echo //registry.npmjs.org/:_authToken=${SECRET_NPM_TOKEN} > ${HOMEDIR}/.npmrc

echoerr "Creating GC BQ Environment"
echo FUSEBIT_GC_BQ_KEY_BASE64=${SECRET_GC_BQ_KEY_BASE64} > gc_bq.env
