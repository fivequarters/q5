#!/bin/bash
# vim: tw=12000

set -e

FUSEPROFILE=dev
BASEURL=https://dev.us-west-1.dev.fusebit.io/v2/account/acc-5e58f2ccd79444e4/subscription/sub-9239585cf84c450a
INTEG_NAME=slack-integration

fuse profile set ${FUSEPROFILE} > /dev/null

echo ${BASEURL}/integration/${INTEG_NAME}/session

curl -s -H 'Content-Type: application/json' -H "Authorization: Bearer `fuse token -o raw`" -XPOST ${BASEURL}/integration/${INTEG_NAME}/session -d '{"redirectUrl": "'${BASEURL}/integration/${INTEG_NAME}/api'"}' | python3 -mjson.tool

TOKEN=`fuse token -o raw`
CREATE_SESSION=`curl -s -H 'Content-Type: application/json' -H "Authorization: Bearer ${TOKEN}" -XPOST ${BASEURL}/integration/${INTEG_NAME}/session -d '{"redirectUrl": "'${BASEURL}/integration/${INTEG_NAME}/api'"}'`

echo ${CREATE_SESSION} | python3 -mjson.tool
SESSION_ID=`echo ${CREATE_SESSION} | jq -r '.id'`

echo \# Send to browser.
echo open ${BASEURL}/integration/${INTEG_NAME}/session/${SESSION_ID}/start

echo ./demo_script_2.sh  ${SESSION_ID}
