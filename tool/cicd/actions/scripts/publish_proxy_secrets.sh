#!/usr/bin/env bash

set -xe

# Get package version
VERSION_FUSEBIT_OPS_CLI=$(cat cli/fusebit-ops-cli/package.json | jq -r .version)

# Install tools
npm install -g https://cdn.fusebit.io/fusebit/cli/fusebit-ops-cli-v${VERSION_FUSEBIT_OPS_CLI}.tgz

PAYLOAD="{\"proxy\":{\"slack\":{\"clientId\":\"${SLACK_PROXY_CLIENT_ID}\",\"clientSecret\":\"${SLACK_PROXY_CLIENT_SECRET}\"}}}"

# 749
fuse-ops profile default github-automation.749
fuse-ops deployment defaults set dev subscription '{\"proxy\":{\"accountId":\"acc-5e58f2ccd79444e4\",\"subscriptionId\":\"sub-9239585cf84c450a\"}}'


# 321
fuse-ops profile default github-automation.321
fuse-ops deployment defaults set stage subscription '{\"proxy\":{\"accountId":\"acc-2ec6c8dba6134772\",\"subscriptionId\":\"sub-2e2374b63eb040e9\"}}'
fuse-ops deployment defaults set api subscription '{\"proxy\":{\"accountId":\"acc-828c6c45cba94d93\",\"subscriptionId\":\"sub-b25bdcca338b4c32\"}}' --us-east-1
fuse-ops deployment defaults set api subscription '{\"proxy\":{\"accountId":\"acc-49c6c6c2f60c4867\",\"subscriptionId\":\"sub-b7efb0965d2a42dc\"}}' --region us-west-1

