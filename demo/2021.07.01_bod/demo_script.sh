#!/bin/bash
# vim: tw=12000

set -e

FUSEPROFILE=customer.litebox.benn.local
BASEURL=http://localhost:3001/v2/account/acc-7a7faa6ffa3f4332/subscription/sub-041ebd4abfb34ebe
INTEG_NAME=testintegration

fuse profile set ${FUSEPROFILE} > /dev/null

curl -s -H 'Content-Type: application/json' -H "Authorization: Bearer `fuse token -o raw`" -XPOST ${BASEURL}/integration/${INTEG_NAME}/session -d '{"redirectUrl": "'${BASEURL}/integration/${INTEG_NAME}/api'"}' | python3 -mjson.tool

TOKEN=`fuse token -o raw`
CREATE_SESSION=`curl -s -H 'Content-Type: application/json' -H "Authorization: Bearer ${TOKEN}" -XPOST ${BASEURL}/integration/${INTEG_NAME}/session -d '{"redirectUrl": "'${BASEURL}/integration/${INTEG_NAME}/api'"}'`

echo ${CREATE_SESSION} | python3 -mjson.tool
SESSION_ID=`echo ${CREATE_SESSION} | jq -r '.id'`

echo \# Send to browser.
echo open ${BASEURL}/integration/${INTEG_NAME}/session/${SESSION_ID}/start

echo ./demo_script_2.sh  ${SESSION_ID}
