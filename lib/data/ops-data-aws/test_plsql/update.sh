aws --profile=fusestage --region us-west-1 rds-data execute-statement --database fusebit \
  --secret-arn arn:aws:secretsmanager:us-west-1:749775346857:secret:rds-db-credentials/fusebit-db-secret-benn-5c3ffc828788a0a255e2-GRI96n \
  --resource-arn arn:aws:rds:us-west-1:749775346857:cluster:fusebit-db-benn --sql file://$*
