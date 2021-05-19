#!/bin/sh
fuse function deploy -b benn oauth-connector -d . -l @fusebit-int/pkg-manager -l @fusebit-int/pkg-oauth-connector -q y
curl -s https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector/callback\?state\=STATE\&code\=YXV0aC4udXNlckBleGFtcGxlLmNvbS4ubnVsbC4uYmFy
