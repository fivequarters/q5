#!/bin/bash
# vim: tw=12000

set -e

FUSEPROFILE=dev.local
BASEURL=http://localhost:3001/v2/account/acc-7e0f8bbc30bc4c34/subscription/sub-0095d2ffa3d1424a
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
