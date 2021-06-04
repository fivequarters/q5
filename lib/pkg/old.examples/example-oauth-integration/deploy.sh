#!/bin/sh
fuse function deploy -b benn oauth-integration -d . -l @fusebit-int/pkg-manager -l @fusebit-int/pkg-oauth-integration -q y
./test.sh
