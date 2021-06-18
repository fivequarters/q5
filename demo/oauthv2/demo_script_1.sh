#!/bin/bash

set -eux

source ./env.sh

echo \# Create an integration called \"${INTEG_NAME}\" and a connector called \"${CON_NAME}\"
fuse integration init -d ${INTEG_NAME}
fuse connector init -d ${CON_NAME}

echo
echo \# Associate ${INTEG_NAME} with ${CON_NAME}
echo \# Configure ${CON_NAME} with OAuth Credentials
cp pieces/integ_fusebit.json ${INTEG_NAME}/fusebit.json
cp pieces/integ_integration.js ${INTEG_NAME}/integration.js
cp pieces/integ_package.json ${INTEG_NAME}/package.json
cp pieces/con_fusebit.json ${CON_NAME}/fusebit.json


echo
echo \# Deploy ${CON_NAME} and ${INTEG_NAME}
fuse integration deploy ${INTEG_NAME} -d ${INTEG_NAME}
fuse connector deploy ${CON_NAME} -d ${CON_NAME}
