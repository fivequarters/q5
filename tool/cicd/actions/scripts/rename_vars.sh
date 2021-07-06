#!/usr/bin/env bash

# Standard header
echoerr() { printf "%s\n" "$*" >&2; }
export FUSEBIT_DEBUG=

# -- Script --
mkdir ~/.aws
echo "[dev]" >> ~/.aws/credentials
echo aws_access_key_id = $DEV_AWS_ACCESS_KEY_ID >> ~/.aws/credentials
echo aws_secret_access_key = $DEV_AWS_SECRET_ACCESS_KEY >> ~/.aws/credentials
echo aws_session_token = $DEV_AWS_SESSION_TOKEN >> ~/.aws/credentials
unset AWS_SECRET_ACCESS_KEY
unset AWS_ACCESS_KEY_ID
unset AWS_SESSION_TOKEN