ACCOUNTID=$1
aws --profile=fusebit.self --region us-west-1 dynamodb query \
  --table-name api.user \
  --projection-expression "primaryEmail" \
  --key-condition-expression "accountId = :account" \
  --expression-attribute-values '{":account":{"S":"'${ACCOUNTID}'"}}' \
  | jq -r '.Items[0].primaryEmail.S'
