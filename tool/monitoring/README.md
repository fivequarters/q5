# CloudWatch Dashboard

Use the following command to export the CloudWatch Dashboard definition:

```bash
./cloudwatch-dashboard.sh us-east-1
```

This will generate a JSON output with the dashboard definition for the `us-east-1` region. You can use this JSON definition to create the dashboard at the AWS Console.

If you are on Mac, you can also use this to copy the result directly to the transfer area:

```bash
./cloudwatch-dashboard.sh us-east-1 | pbcopy
```
