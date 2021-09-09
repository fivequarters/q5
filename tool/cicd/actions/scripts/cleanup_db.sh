#/usr/bin/env bash

# Standard headers
set -x

# AWS envs
REGION=us-east-2
SECRET_ARN=arn:aws:secretsmanager:us-east-2:749775346857:secret:rds-db-credentials/fusebit-db-secret-cicd-ab3ddc2cbd4ff95e73df-tI8URB
DATABASE_ARN=arn:aws:rds:us-east-2:749775346857:cluster:fusebit-db-cicd

aws --region $REGION rds-data execute-statement --database fusebit --secret-arn $SECRET_ARN --resource-arn $DATABASE_ARN --sql "DROP TABLE IF EXISTS entity CASCADE; DROP TABLE IF EXISTS schemaVersion CASCADE; DROP TYPE IF EXISTS entity_type CASCADE; DROP TYPE IF EXISTS entity_state CASCADE;"
