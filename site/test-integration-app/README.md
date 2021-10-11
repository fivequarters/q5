# A simple demo app of a Fusebit integration

This is a single page application that demonstrates the use of a Fusebit integration. It shows some of the Fusebit API calls a Fusebit customer's app would be making. 

1. The app searches for an existing integration install by tenant ID. 
2. If absent, it creates a new integration install and tags it with a specific tenant ID. 
3. It shows instructions for issuing a test request using curl and Node.js. 

## Running

The app is in CDN at https://cdn.fusebit.io/fusebit/app/index.html

The app requires three parameters to be passed in as part of the URL hash fragment: 

* **integrationBaseUrl** The base URL of the integration to test.
* **accessToken** The JWT access token to Fusebit APIs.
* **tenantId** The ID of the tenant to look up or create an integration install for.

For example: `https://cdn.fusebit.io/fusebit/app/index.html#accessToken=ey...&tenantId=daisy-123&integrationBaseUrl=https://stage.us-west-2.fusebit.io/v2/account/acc-9d9341ea356841ed/subscription/sub-ed9d9341ea356841/integration/asanaintegration` (replace the access token)

## Running locally

```
cd demo-app
python3 -m http.server
```

The app is then available at http://localhost:8000/index.html
