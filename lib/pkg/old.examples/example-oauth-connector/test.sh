#!/bin/bash
echo "Getting the OAuth Redirection Url"
curl -si https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector/configure?state=STATE | grep location | sed 's/location: //'

# echo Attempt to login:
# curl -s -i -X POST https://oauth.mocklab.io/login -d "state=STATE&redirectUri=${BASEURL}/callback&cliendId=foo&nonce=bar&email=user@example.com&password=monkey"
