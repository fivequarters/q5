#!/bin/bash

set -eux

source ./env.sh

echo \# Create a new session. > /dev/null
CREATE_SESSION=`curl -s -H 'Content-Type: application/json' -XPOST ${BASEURL}/integration/${INTEG_NAME}/session -d '{"redirectUrl": "http://monkey"}'`

echo ${CREATE_SESSION} | python3 -mjson.tool
SESSION_ID=`echo ${CREATE_SESSION} | jq -r '.id'`

echo \# Send to browser.
open ${BASEURL}/integration/${INTEG_NAME}/session/${SESSION_ID}/start
#START_SESSION=`curl -s --write-out "%{redirect_url}" -o /dev/null ${BASEURL}/integration/${INTEG_NAME}/session/${SESSION_ID}/start`

#echo ${START_SESSION} 
#curl -s --write-out "%{redirect_url}" -o /dev/null ${START_SESSION} 


