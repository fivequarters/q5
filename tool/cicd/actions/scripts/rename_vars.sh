#!/usr/bin/env bash

# Standard header
set -e
echoerr() { printf "%s\n" "$*" >&2; }
export FUSEBIT_DEBUG=

# -- Script --
mkdir ~/.aws
echo "[default]" >> ~/.aws/credentials
echo aws_access_key_id = $DEV_AWS_ACCESS_KEY_ID >> ~/.aws/credentials
echo aws_secret_access_key = $DEV_AWS_SECRET_ACCESS_KEY >> ~/.aws/credentials
echo aws_session_token = $DEV_AWS_SESSION_TOKEN >> ~/.aws/credentials
unset AWS_SECRET_ACCESS_KEY
unset AWS_ACCESS_KEY_ID
unset AWS_SESSION_TOKEN

# Verify caller
ACCOUNT=$(aws sts get-caller-identity | jq .Account)

if [ $ACCOUNT = "\"749775346857\"" ]; then
  return 0
else
  return 1
fi
