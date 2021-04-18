#!/bin/bash
BASEURL="https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector"

echo "Getting the OAuth Redirection Url"
CFG=`curl -s -i ${BASEURL}/configure?state=STATE`
echo ${CFG} | grep "^ location:"

echo ${CFG}
# echo Attempt to login:
# curl -s -i -X POST https://oauth.mocklab.io/login -d "state=STATE&redirectUri=${BASEURL}/callback&cliendId=foo&nonce=bar&email=user@example.com&password=monkey"
