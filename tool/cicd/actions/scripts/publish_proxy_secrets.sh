#!/usr/bin/env bash

set -xe

# Get package version
VERSION_FUSEBIT_OPS_CLI=$(cat cli/fusebit-ops-cli/package.json | jq -r .version)
VERSION_FUSEBIT_CLI=$(cat cli/fusebit-cli/package.json | jq -r .version)

# Install tools
npm install -g https://cdn.fusebit.io/fusebit/cli/fusebit-ops-cli-v${VERSION_FUSEBIT_OPS_CLI}.tgz
npm install -g @fusebit/cli@${VERSION_FUSEBIT_CLI}

# 749
fuse-ops profile set github-automation.749
fuse-ops deployment defaults set dev subscription \{\"proxy\":\{\"accountId\":\"acc-5e58f2ccd79444e4\",\"subscriptionId\":\"sub-9239585cf84c450a\"\}\}

# 321
fuse-ops profile set github-automation.321
fuse-ops deployment defaults set stage subscription \{\"proxy\":\{\"accountId\":\"acc-2ec6c8dba6134772\",\"subscriptionId\":\"sub-2e2374b63eb040e9\"\}\} --region us-west-2
fuse-ops deployment defaults set api subscription \{\"proxy\":\{\"accountId\":\"acc-828c6c45cba94d93\",\"subscriptionId\":\"sub-b25bdcca338b4c32\"\}\} --region us-east-1
fuse-ops deployment defaults set api subscription \{\"proxy\":\{\"accountId\":\"acc-49c6c6c2f60c4867\",\"subscriptionId\":\"sub-b7efb0965d2a42dc\"\}\} --region us-west-1

# 763
fuse-ops profile set github-automation.763
fuse-ops deployment defaults set api subscription \{\"proxy\":\{\"accountId\":\"acc-124a0b2e6a1043d4\",\"subscriptionId\":\"sub-5da267cb8f284af4\"\}\} --region us-west-1

# Create the proxy payloads
ATLASSIAN_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_ATLASSIAN_CLIENT_ID}\",\"clientSecret\":\"${PROXY_ATLASSIAN_CLIENT_SECRET}\",\"authorizationUrl\":\"https://auth.atlassian.com/oauth/authorize\",\"tokenUrl\":\"https://auth.atlassian.com/oauth/token\",\"revokeUrl\":\"https://auth.atlassian.com/oauth/revoke\"}}"

GITHUB_APP_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_GITHUB_APP_CLIENT_ID}\",\"clientSecret\":\"${PROXY_GITHUB_APP_CLIENT_SECRET}\",\"authorizationUrl\":\"https://github.com/login/oauth/authorize\",\"tokenUrl\":\"https://github.com/login/oauth/access_token\",\"revokeUrl\":\"https://api.github.com/applications/CLIENT_ID/token\"}}"

GITHUB_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_GITHUB_CLIENT_ID}\",\"clientSecret\":\"${PROXY_GITHUB_CLIENT_SECRET}\",\"authorizationUrl\":\"https://github.com/login/oauth/authorize\",\"tokenUrl\":\"https://github.com/login/oauth/access_token\",\"revokeUrl\":\"https://api.github.com/applications/CLIENT_ID/token\"}}"

HUBSPOT_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${HUBSPOT_PROXY_CLIENT_ID}\",\"clientSecret\":\"${HUBSPOT_PROXY_CLIENT_SECRET}\",\"authorizationUrl\":\"https://app.hubspot.com/oauth/authorize\",\"tokenUrl\":\"https://api.hubapi.com/oauth/v1/token\",\"revokeUrl\":\"https://api.hubapi.com/oauth/v1/refresh-tokens/:token\"}}"

LINEAR_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_LINEAR_CLIENT_ID}\",\"clientSecret\":\"${PROXY_LINEAR_CLIENT_SECRET}\",\"authorizationUrl\":\"https://linear.app/oauth/authorize\",\"tokenUrl\":\"https://api.linear.app/oauth/token\",\"revokeUrl\":\"https://api.linear.app/oauth/revoke\"}}"

MICROSOFT_TEAMS_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_MICROSOFT_TEAMS_CLIENT_ID}\",\"clientSecret\":\"${PROXY_MICROSOFT_TEAMS_CLIENT_SECRET}\",\"authorizationUrl\":\"https://login.microsoftonline.com/common/oauth2/v2.0/authorize\",\"tokenUrl\":\"https://login.microsoftonline.com/common/oauth2/v2.0/token\",\"revokeUrl\":\"https://login.microsoftonline.com/common/oauth2/v2.0/revoke\"}}"

PAGERDUTY_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_PAGERDUTY_CLIENT_ID}\",\"clientSecret\":\"${PROXY_PAGERDUTY_CLIENT_SECRET}\",\"authorizationUrl\":\"https://app.pagerduty.com/oauth/authorize\",\"tokenUrl\":\"https://app.pagerduty.com/oauth/token\",\"revokeUrl\":\"https://app.pagerduty.com/oauth/revoke\"}}"

SALESFORCE_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${SFDC_PROXY_CLIENT_ID}\",\"clientSecret\":\"${SFDC_PROXY_CLIENT_SECRET}\",\"authorizationUrl\":\"https://login.salesforce.com/services/oauth2/authorize\",\"tokenUrl\":\"https://login.salesforce.com/services/oauth2/token\",\"revokeUrl\":\"https://login.salesforce.com/services/oauth2/revoke\"}}"

SLACK_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${SLACK_PROXY_CLIENT_ID}\",\"clientSecret\":\"${SLACK_PROXY_CLIENT_SECRET}\",\"authorizationUrl\":\"https://slack.com/oauth/v2/authorize\",\"tokenUrl\":\"https://slack.com/api/oauth.v2.access\",\"revokeUrl\":\"https://slack.com/api/auth.revoke\"}}"

# Publish to the designated accounts
for PROFILE in ${PROXY_SECRET_PUBLISH_PROFILE_LIST}; do
  ./tool/cicd/actions/scripts/set_fuse_profile.sh ${PROFILE}
  echo ${ATLASSIAN_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/atlassian/configuration
  echo ${GITHUB_APP_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/github-app/configuration
  echo ${GITHUB_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/github/configuration
  echo ${HUBSPOT_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/hubspot/configuration
  echo ${LINEAR_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/linear/configuration
  echo ${MICROSOFT_TEAMS_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/microsoft-teams/configuration
  echo ${PAGERDUTY_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/pagerduty/configuration
  echo ${SALESFORCE_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/salesforce/configuration
  echo ${SLACK_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/slack/configuration
done
