#!/bin/bash
FUSE_CLI="node cli/fusebit-cli/libc/index.js"
${FUSE_CLI} function ls --output json | jq -rc ".items[] | [.boundaryId, .functionId]" | grep "test-boundary\|test-function\|test-crud\|test-session" |  jq -r '"-b " + .[0] + " " + .[1]' | xargs -P 30 -L 1 ${FUSE_CLI} function rm -q true
${FUSE_CLI} integration ls --output json | jq -rc ".items[] | [.id]" | grep "test-" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE_CLI} integration rm -q true
${FUSE_CLI} connector ls --output json | jq -rc ".items[] | [.id]" | grep "test-" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE_CLI} connector rm -q true
${FUSE_CLI} storage ls --output json | jq -rc ".items[] | [.storageId]" | grep "test-" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE_CLI} storage rm -q true