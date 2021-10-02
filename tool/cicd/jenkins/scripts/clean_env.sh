#/usr/bin/env bash

# Standard headers
set -x

FUSE_CLI="node cli/fusebit-cli/libc/index.js"

# In fusebit cli, some resources does expose a item count, however function ls doesn't :/
# Therefore, to keep with consistency, the rest will also use the raw list as the thing to compare for.
: '
while true; do
  RESOURCES=`${FUSE_CLI} integration ls --output json`
  LEFTOVER_RESOURCES=$(echo $RESOURCES | jq -r .items)
  if [[ $LEFTOVER_RESOURCES == "[]" ]]; then
    break
  fi
  echo $RESOURCES | jq -rc ".items[] | [.id]" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE_CLI} integration rm -q true
done

while true; do
  RESOURCES=`${FUSE_CLI} connector ls --output json`
  LEFTOVER_RESOURCES=$(echo $RESOURCES | jq -r .items)
  if [[ $LEFTOVER_RESOURCES == "[]" ]]; then
    break
  fi
  echo $RESOURCES | jq -rc ".items[] | [.id]" | jq -r '" " + .[0]' | xargs -P 30 -L 1 ${FUSE_CLI} connector rm -q true
done

# Intentionally left out storage cleanup because it seems like it easily gets stuck on a leading / in the key name.

while true; do
  RESOURCES=`${FUSE_CLI} \function ls --output json`
  LEFTOVER_RESOURCES=$(${FUSE_CLI} \function ls -o json | jq -r .items)
  if [[ $LEFTOVER_RESOURCES == "[]" ]]; then
    break
  fi
  echo $RESOURCES | jq -rc ".items[] | [.boundaryId, .functionId]" | jq -r '"-b " + .[0] + " " + .[1]' | xargs -P 30 -L 1 ${FUSE_CLI} function rm -q true
done


# AWS envs
REGION=us-east-2
SECRET_ARN=arn:aws:secretsmanager:us-east-2:749775346857:secret:rds-db-credentials/fusebit-db-secret-jenkins-33e78e97c231edc47568
DATABASE_ARN=arn:aws:rds:us-east-2:749775346857:cluster:fusebit-db-jenkins

aws --region $REGION rds-data execute-statement --database fusebit --secret-arn $SECRET_ARN --resource-arn $DATABASE_ARN --sql "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
'