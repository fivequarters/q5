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
# -- Hygen -- proxy-payload

MICROSOFTGRAPH_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_MICROSOFTGRAPH_CLIENT_ID}\",\"clientSecret\":\"${PROXY_MICROSOFTGRAPH_CLIENT_SECRET}\",\"authorizationUrl\":\"https://login.microsoftonline.com/common/oauth2/v2.0/authorize\",\"tokenUrl\":\"https://login.microsoftonline.com/common/oauth2/v2.0/token\",\"revokeUrl\":\"https://graph.microsoft.com/v1.0/me/revokeSignInSessions\"}}"


MICROSOFTDYNAMICS_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_MICROSOFTDYNAMICS_CLIENT_ID}\",\"clientSecret\":\"${PROXY_MICROSOFTDYNAMICS_CLIENT_SECRET}\",\"authorizationUrl\":\"https://login.microsoftonline.com/common/oauth2/v2.0/authorize\",\"tokenUrl\":\"https://login.microsoftonline.com/common/oauth2/v2.0/token\",\"revokeUrl\":\"https://graph.microsoft.com/v1.0/me/revokeSignInSessions\"}}"


PROCORE_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_PROCORE_CLIENT_ID}\",\"clientSecret\":\"${PROXY_PROCORE_CLIENT_SECRET}\",\"authorizationUrl\":\"https://login.procore.com/oauth/authorize\",\"tokenUrl\":\"https://api.procore.com/oauth/token\",\"revokeUrl\":\"https://api.procore.com/oauth/revoke\"}}"

CONSTANTCONTACT_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_CONSTANTCONTACT_CLIENT_ID}\",\"clientSecret\":\"${PROXY_CONSTANTCONTACT_CLIENT_SECRET}\",\"authorizationUrl\":\"https://authz.constantcontact.com/oauth2/default/v1/authorize\",\"tokenUrl\":\"https://authz.constantcontact.com/oauth2/default/v1/token\",\"revokeUrl\":\"https://authz.constantcontact.com/oauth2/default/v1/revoke\"}}"

OUTREACH_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_OUTREACH_CLIENT_ID}\",\"clientSecret\":\"${PROXY_OUTREACH_CLIENT_SECRET}\",\"authorizationUrl\":\"https://api.outreach.io/oauth/authorize\",\"tokenUrl\":\"https://api.outreach.io/oauth/token\",\"revokeUrl\":\"https://api.outreach.io/oauth/revoke\"}}"

MAILCHIMP_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_MAILCHIMP_CLIENT_ID}\",\"clientSecret\":\"${PROXY_MAILCHIMP_CLIENT_SECRET}\",\"authorizationUrl\":\"https://login.mailchimp.com/oauth2/authorize\",\"tokenUrl\":\"https://login.mailchimp.com/oauth2/token\",\"revokeUrl\":\"https://login.mailchimp.com/oauth2/token/not_supported\"}}"

GITLAB_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_GITLAB_CLIENT_ID}\",\"clientSecret\":\"${PROXY_GITLAB_CLIENT_SECRET}\",\"authorizationUrl\":\"https://gitlab.com/oauth/authorize\",\"tokenUrl\":\"https://gitlab.com/oauth/token\",\"revokeUrl\":\"https://gitlab.com/oauth/revoke\"}}"

SLACK_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${SLACK_PROXY_CLIENT_ID}\",\"clientSecret\":\"${SLACK_PROXY_CLIENT_SECRET}\",\"authorizationUrl\":\"https://slack.com/oauth/v2/authorize\",\"tokenUrl\":\"https://slack.com/api/oauth.v2.access\",\"revokeUrl\":\"https://slack.com/api/auth.revoke\"}}"

HUBSPOT_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${HUBSPOT_PROXY_CLIENT_ID}\",\"clientSecret\":\"${HUBSPOT_PROXY_CLIENT_SECRET}\",\"authorizationUrl\":\"https://app.hubspot.com/oauth/authorize\",\"tokenUrl\":\"https://api.hubapi.com/oauth/v1/token\",\"revokeUrl\":\"https://api.hubapi.com/oauth/v1/refresh-tokens/:token\"}}"

SALESFORCE_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${SFDC_PROXY_CLIENT_ID}\",\"clientSecret\":\"${SFDC_PROXY_CLIENT_SECRET}\",\"authorizationUrl\":\"https://login.salesforce.com/services/oauth2/authorize\",\"tokenUrl\":\"https://login.salesforce.com/services/oauth2/token\",\"revokeUrl\":\"https://login.salesforce.com/services/oauth2/revoke\"}}"

LINEAR_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_LINEAR_CLIENT_ID}\",\"clientSecret\":\"${PROXY_LINEAR_CLIENT_SECRET}\",\"authorizationUrl\":\"https://linear.app/oauth/authorize\",\"tokenUrl\":\"https://api.linear.app/oauth/token\",\"revokeUrl\":\"https://api.linear.app/oauth/revoke\"}}"

GITHUB_OAUTH_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_GITHUB_OAUTH_CLIENT_ID}\",\"clientSecret\":\"${PROXY_GITHUB_OAUTH_CLIENT_SECRET}\",\"authorizationUrl\":\"https://github.com/login/oauth/authorize\",\"tokenUrl\":\"https://github.com/login/oauth/access_token\",\"revokeUrl\":\"https://api.github.com/applications/CLIENT_ID/token\"}}"

GITHUB_APP_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_GITHUB_APP_CLIENT_ID}\",\"clientSecret\":\"${PROXY_GITHUB_APP_CLIENT_SECRET}\",\"authorizationUrl\":\"https://github.com/login/oauth/authorize\",\"tokenUrl\":\"https://github.com/login/oauth/access_token\",\"revokeUrl\":\"https://api.github.com/applications/CLIENT_ID/token\"}}"

ATLASSIAN_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_ATLASSIAN_CLIENT_ID}\",\"clientSecret\":\"${PROXY_ATLASSIAN_CLIENT_SECRET}\",\"authorizationUrl\":\"https://auth.atlassian.com/authorize\",\"tokenUrl\":\"https://auth.atlassian.com/oauth/token\",\"revokeUrl\":\"https://auth.atlassian.com/oauth/revoke\"}}"

PAGERDUTY_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_PAGERDUTY_CLIENT_ID}\",\"clientSecret\":\"${PROXY_PAGERDUTY_CLIENT_SECRET}\",\"authorizationUrl\":\"https://app.pagerduty.com/oauth/authorize\",\"tokenUrl\":\"https://app.pagerduty.com/oauth/token\",\"revokeUrl\":\"https://app.pagerduty.com/oauth/revoke\"}}"

ASANA_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_ASANA_CLIENT_ID}\",\"clientSecret\":\"${PROXY_ASANA_CLIENT_SECRET}\",\"authorizationUrl\":\"https://app.asana.com/-/oauth_authorize\",\"tokenUrl\":\"https://app.asana.com/-/oauth_token\",\"revokeUrl\":\"https://app.asana.com/-/oauth_revoke\"}}"

REDDIT_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_REDDIT_CLIENT_ID}\",\"clientSecret\":\"${PROXY_REDDIT_CLIENT_SECRET}\",\"authorizationUrl\":\"https://www.reddit.com/api/v1/authorize\",\"tokenUrl\":\"https://www.reddit.com/api/v1/access_token\",\"revokeUrl\":\"https://www.reddit.com/api/v1/revoke_token\"}}"

DISCORD_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_DISCORD_CLIENT_ID}\",\"clientSecret\":\"${PROXY_DISCORD_CLIENT_SECRET}\",\"authorizationUrl\":\"https://discord.com/api/oauth2/authorize\",\"tokenUrl\":\"https://discord.com/api/oauth2/token\",\"revokeUrl\":\"https://discord.com/api/oauth2/token/revoke\"}}"

ZOOM_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_ZOOM_CLIENT_ID}\",\"clientSecret\":\"${PROXY_ZOOM_CLIENT_SECRET}\",\"authorizationUrl\":\"https://zoom.us/oauth/authorize\",\"tokenUrl\":\"https://zoom.us/oauth/token\",\"revokeUrl\":\"hhttps://zoom.us/oauth/revoke\"}}"

STACKOVERFLOW_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_STACKOVERFLOW_CLIENT_ID}\",\"clientSecret\":\"${PROXY_STACKOVERFLOW_CLIENT_SECRET}\",\"clientKey\":\"${PROXY_STACKOVERFLOW_CLIENT_KEY}\",\"authorizationUrl\":\"https://stackoverflow.com/oauth\",\"tokenUrl\":\"https://stackoverflow.com/oauth/access_token/json\",\"revokeUrl\":\"https://stackoverflow.com/oauth/unsupported\"}}"

GOOGLE_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_GOOGLE_CLIENT_ID}\",\"clientSecret\":\"${PROXY_GOOGLE_CLIENT_SECRET}\",\"authorizationUrl\":\"https://accounts.google.com/o/oauth2/v2/auth\",\"tokenUrl\":\"https://oauth2.googleapis.com/token\",\"revokeUrl\":\"https://oauth2.googleapis.com/revoke\"}}"

QUICKBOOKS_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_QUICKBOOKS_CLIENT_ID}\",\"clientSecret\":\"${PROXY_QUICKBOOKS_CLIENT_SECRET}\",\"authorizationUrl\":\"https://appcenter.intuit.com/connect/oauth2\",\"tokenUrl\":\"https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer\",\"revokeUrl\":\"https://developer.api.intuit.com/v2/oauth2/tokens/revoke\"}}"

LINKEDIN_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_LINKEDIN_CLIENT_ID}\",\"clientSecret\":\"${PROXY_LINKEDIN_CLIENT_SECRET}\",\"authorizationUrl\":\"https://www.linkedin.com/oauth/v2/authorization\",\"tokenUrl\":\"https://www.linkedin.com/oauth/v2/accessToken\",\"revokeUrl\":\"https://www.linkedin.com/oauth/v2/revoke\"}}"

TWITTER_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_TWITTER_CLIENT_ID}\",\"clientSecret\":\"${PROXY_TWITTER_CLIENT_SECRET}\",\"authorizationUrl\":\"https://twitter.com/i/oauth2/authorize\",\"tokenUrl\":\"https://api.twitter.com/2/oauth2/token\",\"revokeUrl\":\"https://twitter.com/i/oauth2/invalidate_token\",\"codeChallenge\":\"example_code_challenge\"}}"

AWS_SECRET_PAYLOAD="{\"data\":{\"accessKeyId\":\"${PROXY_AWS_ACCESS_KEY_ID}\",\"secretAccessKey\":\"${PROXY_AWS_SECRET_ACCESS_KEY}\",\"region\":\"us-west-2\",\"bucketName\":\"fusebit-aws-demo-app\",\"bucketPrefix\":\"proxy\"}}"

# Publish to the designated accounts
for PROFILE in ${PROXY_SECRET_PUBLISH_PROFILE_LIST}; do
  ./tool/cicd/actions/scripts/set_fuse_profile.sh ${PROFILE}
  # -- Hygen -- proxy-list
  echo ${MICROSOFTGRAPH_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/microsoftgraph/configuration
  echo ${MICROSOFTDYNAMICS_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/microsoftdynamics/configuration
  echo ${PROCORE_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/procore/configuration
  echo ${CONSTANTCONTACT_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/constantcontact/configuration
  echo ${OUTREACH_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/outreach/configuration
  echo ${MAILCHIMP_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/mailchimp/configuration
  echo ${GITLAB_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/gitlab/configuration
  echo ${SLACK_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/slack/configuration
  echo ${HUBSPOT_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/hubspot/configuration
  echo ${SALESFORCE_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/salesforce/configuration
  echo ${LINEAR_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/linear/configuration
  echo ${GITHUB_OAUTH_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/githuboauth/configuration
  echo ${GITHUB_APP_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/githubapp/configuration
  echo ${ATLASSIAN_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/atlassian/configuration
  echo ${PAGERDUTY_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/pagerduty/configuration
  echo ${ASANA_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/asana/configuration
  echo ${REDDIT_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/reddit/configuration
  echo ${DISCORD_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/discord/configuration
  echo ${ZOOM_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/zoom/configuration
  echo ${STACKOVERFLOW_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/stackoverflow/configuration
  echo ${GOOGLE_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/google/configuration
  echo ${QUICKBOOKS_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/quickbooks/configuration
  echo ${LINKEDIN_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/linkedin/configuration
  echo ${TWITTER_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/twitter/configuration
  echo ${AWS_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/aws/configuration
done
