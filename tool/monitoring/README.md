# CloudWatch Dashboard

Use the following command to export the CloudWatch Dashboard definition:

```bash
./cloudwatch-dashboard.sh us-east-1
```

This will generate a JSON output with the dashboard definition for the `us-east-1` region. You can use this JSON definition to create the dashboard at the AWS Console. Or, if you prefer, you can use the following commands to update a dashboard directly from your terminal:

```bash
DASHBOARD_NAME=ENG-140-US-EAST-1
DASHBOARD_BODY=$(./cloudwatch-dashboard.sh us-east-1 | jq -c)

aws cloudwatch put-dashboard --dashboard-name $DASHBOARD_NAME --dashboard-body $DASHBOARD_BODY
```

Also, if you are on Mac and prefer a more manual process, you can also use the following command to copy the JSON output directly to the transfer area and then paste it on AWS Console:

```bash
./cloudwatch-dashboard.sh us-east-1 | pbcopy
```
