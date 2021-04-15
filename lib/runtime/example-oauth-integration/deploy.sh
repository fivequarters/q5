#!/bin/sh
fuse function deploy -b benn oauth-integration -d . -l @fusebit-int/pkg-manager -q y
./test.sh
