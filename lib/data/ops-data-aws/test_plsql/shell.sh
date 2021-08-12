#!/bin/bash

source env.${PROFILE}
aws --profile=${AWS_PROFILE} --region ${REGION} rds-data execute-statement --database fusebit \
  --secret-arn  ${SECRET_ARN} \
  --resource-arn ${DATABASE_ARN} --sql "select entityId from entity where entityType = 'identity';"
