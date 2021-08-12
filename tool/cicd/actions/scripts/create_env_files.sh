#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }

# -- Script --
echoerr "Creating api/function-api/.env"
DOTENV=api/function-api/.env
echo DEPLOYMENT_KEY=stage > ${DOTENV}.template
echo AWS_REGION=us-west-2 >> ${DOTENV}.template
echo API_SERVER=https://stage.us-west-2.fusebit.io >> ${DOTENV}.template
echo > ${DOTENV}.bootstrap

echoerr "Creating ~/.fusebit profile"
FUSEBIT_KEYPATH=`echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.user.keyPath'`
mkdir -p ~/.fusebit/${FUSEBIT_KEYPATH}
echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.user.settings' > ~/.fusebit/settings.json
echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.user.keys.privateKey' > ~/.fusebit/${FUSEBIT_KEYPATH}/pri
echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.user.keys.publicKey' > ~/.fusebit/${FUSEBIT_KEYPATH}/pub

echoerr "Creating ~/.fusebit-ops profile"
OPS_PROFILE_NAME=`echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.ops.profileName'`
OPS_PROFILE=`echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.ops.settings.profiles["'${OPS_PROFILE_NAME}'"]'`
mkdir -p ~/.fusebit-ops
echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.ops.settings' > ~/.fusebit-ops/settings.json

echoerr "Creating ~/.aws/config"
mkdir ~/.aws
echo "[default]" > ~/.aws/config
echo "region = us-west-2" >> ~/.aws/config

echoerr "Creating ~/.aws/credentials"
echo "[default]" > ~/.aws/credentials
echo "aws_access_key_id = `echo ${OPS_PROFILE} | jq -r '.awsAccessKeyId'`" >> ~/.aws/credentials
echo "aws_secret_access_key = `echo ${OPS_PROFILE} | jq -r '.awsSecretAccessKey'`" >> ~/.aws/credentials

echoerr "Creating ~/.npmrc"
echo //registry.npmjs.org/:_authToken=${SECRET_NPM_TOKEN} > ~/.npmrc

echoerr "Creating GC BQ Environment"
echo FUSEBIT_GC_BQ_KEY_BASE64=${SECRET_GC_BQ_KEY_BASE64} > gc_bq.env
