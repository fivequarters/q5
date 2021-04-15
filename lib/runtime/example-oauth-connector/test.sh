#!/bin/bash
BASEURL="https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector"

echo "Getting the OAuth Redirection Url"
CFG=`curl -s ${BASEURL}/configure?state=STATE`
echo ${CFG} | python3 -m json.tool
URL=`echo ${CFG} | jq -r ".result.header.location"`
echo URL: ${URL}

echo Attempt to login:
curl -s -i -X POST https://oauth.mocklab.io/login -d "state=STATE&redirectUri=${BASEURL}/callback&cliendId=foo&nonce=bar&email=user@example.com&password=monkey"

echo Redirct to ${BASEURL}/callback?state=STATE\&code=YXV0aC4udXNlckBleGFtcGxlLmNvbS4ubnVsbC4uYmFy with a code:
curl ${BASEURL}/callback?state=STATE\&code=YXV0aC4udXNlckBleGFtcGxlLmNvbS4ubnVsbC4uYmFy

