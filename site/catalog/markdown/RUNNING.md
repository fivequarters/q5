# Running your Integration

To run the Integration and test as you make changes, follow these steps:

1. (First run only) The integration needs to know the Identity of the Slack user on whose behalf to execute. In production, this will be handled by your application, but for test purposes, you can log in your first user manually.

First, generate a token by running

`fuse token -o raw`

Once you have the token, include it in the following URL and navigate to it in a web browser:

https://cdn.fusebit.io/fusebit/app/index.html#accessToken={token}&tenantId=user1&integrationBaseUrl=<% global.consts.endpoint %>/v2/account/<% global.consts.accountId %>/subscription/<%
global.consts.subscriptionId %>/integration/<% global.consts.integrationId %>

You will be asked to log in as a specific Slack user, and the integration will act on behalf of that user
going forward.

2. Note the `curl` command and JavaScript example shown in the last step, use that to invoke the integration. If your token expires, you can always generate a new one using the `fuse token` command shown above.
