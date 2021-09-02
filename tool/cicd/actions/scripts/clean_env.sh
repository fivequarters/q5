#!/bin/bash
FUSE_CLI="node cli/fusebit-cli/libc/index.js"

# In fusebit cli, some resources does expose a item count, however function ls doesn't :/
# Therefore, to keep with consistency, the rest will also use the raw list as the thing to compare for.

while true; do
  ${FUSE_CLI} integration ls --output json | jq -rc ".items[] | [.id]" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE_CLI} integration rm -q true
  LEFTOVER_RESOURCES=$(${FUSE_CLI} integration ls -o json | jq -r .items)
  if [[ $LEFTOVER_RESOURCES == "[]" ]]; then
    break
  fi
done

while true; do
  ${FUSE_CLI} connector ls --output json | jq -rc ".items[] | [.id]" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE_CLI} connector rm -q true
  LEFTOVER_RESOURCES=$(${FUSE_CLI} connector ls -o json | jq -r .items)
  if [[ $LEFTOVER_RESOURCES == "[]" ]]; then
    break
  fi
done

while true; do
  ${FUSE_CLI} storage ls --output json | jq -rc ".items[] | [.storageId]" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE_CLI} storage rm -q true
  LEFTOVER_RESOURCES=$(${FUSE_CLI} storage ls -o json | jq -r .items)
  if [[ $LEFTOVER_RESOURCES == "[]" ]]; then
    break
  fi
done

while true; do
  ${FUSE_CLI} function ls --output json | jq -rc ".items[] | [.boundaryId, .functionId]" | jq -r '"-b " + .[0] + " " + .[1]' | xargs -P 30 -L 1 ${FUSE_CLI} function rm -q true
  LEFTOVER_RESOURCES=$(${FUSE_CLI} function ls -o json | jq -r .items)
  if [[ $LEFTOVER_RESOURCES == "[]" ]]; then
    break
  fi
done
