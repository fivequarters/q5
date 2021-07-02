#!/bin/bash
# vim: tw=12000

set -ex

FUSEPROFILE=customer.litebox.benn.local
BASEURL=http://localhost:3001/v2/account/acc-7a7faa6ffa3f4332/subscription/sub-041ebd4abfb34ebe
INTEG_NAME=testintegration
TOKEN=`fuse token -o raw`

SESSION_ID=$1

if [ "${SESSION_ID}z" == "z" ]; then
  echo Usage: Supply the session id as the first parameter.
  exit -1
fi

echo Completing ${SESSION_ID}

POST_SESSION=`curl -s -H 'Content-Type: application/json' -H "Authorization: Bearer ${TOKEN}" -XPOST ${BASEURL}/integration/${INTEG_NAME}/session/${SESSION_ID}`
echo ${POST_SESSION} | python3 -mjson.tool
OPERATION_ID=`echo ${POST_SESSION} | jq -r '.operationId'`
echo Waiting 10 seconds for completion...
sleep 10

GET_OPERATION=`curl -s -H 'Content-Type: application/json' -H "Authorization: Bearer ${TOKEN}" ${BASEURL}/operation/${OPERATION_ID}`
echo ${GET_OPERATION} | python3 -mjson.tool
CONN_ID=`echo ${GET_OPERATION} | jq -r '.payload.conn1.id'`
echo Open the following url:
echo   http://localhost:3001/v2/account/acc-7a7faa6ffa3f4332/subscription/sub-041ebd4abfb34ebe/integration/testintegration/api/asana/${CONN_ID}
echo With the conn1.id
