FUSE="node cli/fusebit-cli/libc/index.js"


${FUSE} integration ls --output json | jq -rc ".items[] | [.id]" | grep "test-" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE} integration rm -q true
${FUSE} connector ls --output json | jq -rc ".items[] | [.id]" | grep "test-" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE} connector rm -q true
${FUSE} storage ls --output json | jq -rc ".items[] | [.storageId]" | grep "test-" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE} storage rm -q true
${FUSE} function ls --output json | jq -rc ".items[] | [.boundaryId, .functionId]" | grep "test-boundary\|test-function\|test-crud\|test-session" |  jq -r '"-b " + .[0] + " " + .[1]' | xargs -P 30 -L 1 ${FUSE} function rm -q true

