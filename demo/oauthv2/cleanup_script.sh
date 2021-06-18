#!/bin/bash

source ./env.sh

fuse integration rm -q true ${INTEG_NAME}
fuse connector rm -q true ${CON_NAME}

rm -rf ${INTEG_NAME} ${INTEG_NAME}.function
rm -rf ${CON_NAME} ${CON_NAME}.function
