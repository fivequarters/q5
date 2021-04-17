#!/bin/bash
BASEURL="https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-integration"

curl -s ${BASEURL}/hello/STATE | python3 -m json.tool

