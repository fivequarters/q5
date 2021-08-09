#!/usr/bin/env bash

# Get package version
VERSION_FUSEBIT_OPS_CLI=$(cat cli/fusebit-ops-cli/package.json | jq -r .version)

# Install tools
npm install -g https://cdn.fusebit.io/fusebit/cli/fusebit-ops-cli-v${VERSION_FUSEBIT_OPS_CLI}.tgz

PAYLOAD="{\"proxy\": {\"slack\": { \"clientId\": \"${SLACK_PROXY_CLIENT_ID}\", \"clientSecret\": \"${SLACK_PROXY_CLIENT_SECRET}\" }}}"

# 749
fuse-ops profile default github-automation.749

fuse-ops deployment defaults set dev subscription $PAYLOAD

# 321
fuse-ops profile default github-automation.321

fuse-ops deployment defaults set api subscription $PAYLOAD --region us-west-1
fuse-ops deployment defaults set api subscription $PAYLOAD --region us-east-1
fuse-ops deployment defaults set stage subscription $PAYLOAD --region us-west-2
