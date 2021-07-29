#!/bin/bash
# vim: tw=12000

set -ex
BASEURL=
INTEG_NAME=slack-integration
TOKEN=`fuse token -o raw`
CONNECTOR_NAME='slack1'

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

GET_SESSION_RESULT=`curl -s -H 'Content-Type: application/json' -H "Authorization: Bearer ${TOKEN}" ${BASEURL}/integration/${INTEG_NAME}/session/result/${SESSION_ID}`
echo ${GET_SESSION_RESULT} | python3 -mjson.tool
INSTANCE_ID=`echo ${GET_SESSION_RESULT} | jq -r '.output.entityId'`

GET_INSTANCE_RESULT=`curl -s -H 'Content-Type: application/json' -H "Authorization: Bearer ${TOKEN}" ${BASEURL}/integration/${INTEG_NAME}/instance/${INSTANCE_ID}`
echo ${GET_INSTANCE_RESULT} | python3 -mjson.tool
IDENTITY_ID=`echo ${GET_INSTANCE_RESULT} | jq -r .data.${CONNECTOR_NAME}.entityId`

echo  \# Execute the following command:
echo curl -d "'"'{ "message": "Fusebit rocks :the_horns:"}'"'" -H "'"'Content-Type: application/json'"'" -X POST ${BASEURL}/integration/slack-integration/api/message/${IDENTITY_ID}
