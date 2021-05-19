aws --profile=fusestage --region us-west-1 rds-data execute-statement --database fusebit \
  --secret-arn arn:aws:secretsmanager:us-west-1:749775346857:secret:rds-db-credentials/fusebit-db-secret-benn-3a0aa0a9ee63a1de9087-qmVaRo \
  --resource-arn arn:aws:rds:us-west-1:749775346857:cluster:fusebit-db-benn --sql "$*"
