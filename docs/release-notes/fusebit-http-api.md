---
parent: Release Notes
nav_order: 3
title: Fusebit HTTP API
---

<!-- prettier-ignore-start -->
# Fusebit HTTP API
{: .no_toc }
<!-- prettier-ignore-end -->

The Fusebit HTTP API enables customers to manage functions created on the platform and to administer users and their permissions via a REST interface.

All public releases of the Fusebit HTTP API are documented here, including notable changes made in every release. HTTP API releases follow the [Semantic Versioning 2.0 specification](https://semver.org/). For more information on the Fusebit versioning strategy, see [here](http://fusebit.io/docs/integrator-guide/versioning).

<!-- prettier-ignore -->
<!-- 1. TOC
{:toc} -->

## Version 1.40.18

_Released 9/21/22_


- **Enhancement** Update to Health Dashboad to convert Status Code column from Bar to Colored Text

## Version 1.40.17

_Released 9/20/22_

- **Diagnostic** Further instrumentation of RDS Data Service

## Version 1.40.14

_Released 9/12/22_

- **Bugfix** Fix invalid grafana initialization call during account creation

## Version 1.40.13

_Released 9/9/22_

- **Enhancement** Add Health Monitoring Dashboard to Grafana Defaults.

## Version 1.40.12

_Released 9/6/22_

- **Diagnostic** Improve capture of RDS request IDs for tardy responses.

## Version 1.40.11

_Released 8/2/22_

- **Enhancement** Support managed Grafana dashboards per user.

## Version 1.40.10

_Released 8/1/22_

- **Bugfix** Extend task permissions into v2 route endpoints.
- **Bugfix** Enable function serve with tasks.
- **Bugfix** Remove unnecessary duplication of permissions added to v2 routes.

## Version 1.40.7

_Released 7/27/22_

- **Bugfix** Fix logging of results for tasks running longer than 120 seconds.

## Version 1.40.6

_Released 7/22/22_

- **Bugfix** Improve module resolution algorithm to improve fallback behaviors.

## Version 1.40.5

_Released 7/20/22_

- **Enhancement** Change timeout restrictions to be 900s for integrations.

## Version 1.40.4

_Released 7/15/22_

- **Enhancement** Support tasks in v2 entities.

## Version 1.40.2

_Released 6/29/22_

- **Enhancement** Add `--no-audit` to the `npm install` build arguments for packages.

## Version 1.40.1

_Released 6/24/22_

- **Bugfix** Fix for regression in encoding of the `ctx.path` parameter.

## Version 1.40.0

_Released 6/20/22_

- **Enhancement** Support for tasks.

## Version 1.39.5

_Released 6/15/22_

- **Bugfix** Upgrade Loki to 2.5.0 to eliminate out-of-order event drops.

## Version 1.39.4

_Released 6/15/22_

- **Bugfix** Catch additional traces in functions and better associate them with the active request.

## Version 1.39.3

_Released 6/2/22_

- **Enhancement** Provision Grafana resources on new account creation.

## Version 1.39.2

_Released 5/23/22_

- **Enhancement** Partition log events under the `fusebit_` namespace for internal attributes.

## Version 1.39.1

_Released 5/23/22_

- **Enhancement** Correctly error on an invalid redirectUrl in session creation.

## Version 1.38.3

_Released 5/13/22_

- **Enhancement** Improved analytics tracking of events.

## Version 1.38.2

_Released 5/9/22_

- **Enhancement** NodeJS 16 support for Fusebit functions, integrations, and connectors.

## Version 1.38.1

_Released 5/5/22_

- **Bugfix** Reduce restrictions on allowed redirect addresses when serving functions.

## Version 1.38.0

_Released 5/4/22_

- **Enhancement** Return entity dates in ISO format with a `T` instead of ``.
- **Enhancement** Include the `entityType` field in returned objects.

## Version 1.37.1

_Released 4/22/22_

- **Bugfix** Improve internal error handling.

## Version 1.37.0

_Released 4/10/22_

- **Enhancement** Support `sort` parameter to list endpoints to search off of several criteria.
- **Bugfix** Correctly sanitize the results of an integration or connector creation operation.

## Version 1.36.1

_Released 4/7/22_

- **Security** Patch Axios against CVE-2021-3749.

## Version 1.36.0

_Released 3/17/22_

- **Enhancement** Support /install and /identity endpoints to search across all Integrations and Connectors.

## Version 1.35.10

_Released 3/17/22_

- **Bugfix** Allow the `%` character within tag key and values for sessions.

## Version 1.35.9

_Released 3/4/22_

- **Bugfix** Support implied GET requests in NodeJS tracing.

## Version 1.35.8

_Released 3/4/22_

- **Enhancement** Accelerate first-build times by leveraging common @fusebit-int pre-built packages.

## Version 1.35.7

_Released 3/2/22_

- **Enhancement** Support v2 analytics with CRON triggered function executions.

## Version 1.35.6

_Released 2/28/22_

- **Bugfix** Corrected an error preventing usage of the Twitter proxy client.

## Version 1.35.5

_Released 2/23/22_

- **Bugfix** Allow an empty schedule to be used in an entity specification.

## Version 1.35.4

_Released 2/23/22_

- **Enhancement.** Correct spelling mistakes.

## Version 1.35.3

_Released 2/22/22_

- **Enhancement** Allow the use of static IP enabled Fusebit functions when v2 analytics is enabled.

## Version 1.35.2

_Released 2/19/22_

- **Enhancement.** Updating default AWS Lambda layers to include full Node.js release.

## Version 1.35.1

_Released 2/18/22_

- **Bugfix.** Improved support for module and function builders for custom Node.js versions.

## Version 1.35.0

_Released 2/16/22_

- **Enhancement.** Support for all versions of Node.js >= 11.

## Version 1.34.5

_Released 2/11/22_

- **Bugfix.** Remove unused diagnostic code.

## Version 1.34.4

_Released 2/11/22_

- **Enhancement.** Support Grafana for v2 invocations.

## Version 1.34.3

_Released 2/10/22_

- **Bugfix.** Remove unnecessary configuration work when static IP is not set.

## Version 1.34.2

_Released 2/10/22_

- **Bugfix.** Clone request objects that contain non-JSON parsable elements in function tracing code.

## Version 1.34.1

_Released 2/7/22_

- **Enhancement.** Support monitoring, logging, and tracing using Grafana

## Version 1.33.7

_Released 1/11/22_

- **Enhancement.** Fusebit Code Editor configuration options added to functions and integrations.

## Version 1.33.6

_Released 1/4/22_

- **Bugfix.** Properly handle OAuth flow cancellation when using proxy credentials

## Version 1.33.5

_Released 12/17/21_

- **Enhancement.** Proxy support for Stack Overflow.

## Version 1.33.3

_Released 12/14/21_

- **Enhancement.** Extend the function authorization token to include a profile claim.

## Version 1.33.2

_Released 12/13/21_

- **Enhancement.** Support binary files encoded using 'base64' in function, integration, and connector specifications.
- **Enhancement.** Increase default memory allocation to v2 artifacts to 512mb.

## Version 1.32.6

_Released 12/7/21_

- **Enhancement.** Support returning binary payload Buffer objects from v2 invocations.

## Version 1.32.5

_Released 12/4/21_

- **Enhancement.** Support Sessions with explicitly specified steps.

## Version 1.32.4

_Released 11/23/21_

- **Enhancement.** Updated proxy service to allow for unique authorization model needed for Reddit integrations.

## Version 1.32.3

_Released 11/23/21_

- **Bugfix.** Add support for the new "Pending" AWS Lambda lifecycle state.

## Version 1.32.2

_Released 11/23/21_

- **Bugfix.** Hotfix to workaround the AWS Lambda States changes.

## Version 1.32.1

_Released 11/23/21_

- **Bugfix.** Expire orphaned Leaf sessions.

## Version 1.32.0

_Released 11/23/21_

- **Enhancement.** Adjust audit live access ttl.

## Version 1.31.0

_Released 11/18/21_

- **Enhancement.** Support permission specifications for v2 entities.

## Version 1.30.1

_Released 11/17/21_

- **Bugfix.** Allow integrations with no associated connectors.

## Version 1.30.0

_Released 11/17/21_

- **Enhancement.** Nested the defaultEventHandler connection option under configuration.

## Version 1.29.1

_Released 11/15/21_

- **Bugfix.** Internal npm package registry search returns the first 20 entries, and propagates `next` correctly.

## Version 1.29.0

_Released 11/14/21_

- **Security.** Update various dependencies with critical CVEs.

## Version 1.28.4

_Released 11/13/21_

- **Bugfix.** Fusebit function deletion now internally retry to prevent orphaned lambda resources.

## Version 1.28.2

_Released 11/4/21_

- **Enhancement.** Enable persistent capture of stdout/err of connectors and integrations by default.
- **Enhancement.** Add more metadata to CloudWatch events related to integrations and connectors.

## Version 1.28.1

_Released 11/2/21_

- **Bugfix.** Capture full URL of HTTP requests in logs.

## Version 1.28.0

_Released 11/1/21_

- **Enhancement.** Add support for accessing historical logs.

## Version 1.27.2

_Released 10/26/21_

- **Bugfix.** Explicitly allow the 'application/json' type for responses on OAuth proxy requests.

## Version 1.27.1

_Released 10/21/21_

- **Bugfix.** Propagate integration/connector update failures.

## Version 1.27.0

_Released 10/19/21_

- **Bugfix.** Allow PUT operations on identity and install objects.

## Version 1.26.0

_Released 10/9/21_

- **Enhancement.** Rename 'instance' to 'install'.
- **Enhancement.** Change the primary key for installs, identities, and sessions to a `prefix-random{32}` format.

## Version 1.25.0

_Released 10/7/21_

- **Bugfix.** Migrate session POST to use the 'session:add' permission.

## Version 1.24.0

_Released 10/5/21_

- **Enhancement.** Normalize various permissions for v2 artifacts.

## Version 1.23.15

_Released 9/29/21_

- **Enhancement.** Adding a new endpoint to enable users to patch their accounts display name.

## Version 1.23.14

_Released 9/29/21_

- **Enhancement.** Now our HTTP API will raise an error when the caller requests static IP for a function on a subscription that doesn't have the feature flag enabled.

## Version 1.23.11

_Released 9/21/21_

- **Enhancement.** Commit session now triggers an async process, returning a targetUrl that the caller can use to check the status.

## Version 1.23.8

_Released 9/10/21_

- **Enhancement.** Adding support for webhooks.

## Version 1.23.4

_Released 9/8/21_

- **Enhancement.** Adding support for scheduled integrations.

## Version 1.23.3

_Released 9/7/21_

- **Enhancement.** Updating default version of @fusebit-int/oauth-connector and @fusebit-int/framework.

## Version 1.23.2

_Released 09/07/21_

- **Enhancement.** Switch to error code 522 instead of 500 when a fusebit function times out.

## Version 1.23.1

_Released 9/2/21_

- **Enhancement.** Upgrade superagent.

## Version 1.22.8

_Released 08/25/21_

- **Enhancement.** Improve health check reporting to clarify the failure's location.

## Version 1.22.6

_Released 08/23/21_

- **Enhancement.** Storage Id field added to GET requests for storage data.

## Version 1.22.5

_Released 08/23/21_

- **Enhancement.** Increase maximum storage payload size up to 400kb.

## Version 1.21.3

_Released 08/16/21_

- **Enhancement.** Analytic data now includes `account-id` information.

## Version 1.20.28

_Released 7/27/21_

- **Enhancement.** Subscriptions now support default values supplied via global configuration elements.

## Version 1.20.27

_Released 7/26/21_

- **Enhancement** OperationId corresponding to processing of session into instances and identities is now saved to sessions.

## Version 1.20.26

_Released 07/23/21_

- **Enhancement.** Restricts access to the static IP feature of Fusebit Functions to subscriptions that contain the `staticIp` flag set to `"true"`.

## Version 1.20.25

_Released 07/20/21_

- **Enhancement.** Improves /v1/health to also check for the liveliness of RDS.

## Version 1.20.24

_Released 07/16/21_

- **Enhancement.** Integration Sessions can now be ran against an existing set of Instances and Identities in order to update their values.

## Version 1.20.23

_Released 07/15/21_

- **Bugfix.** Change the allowed editor version to support >1.4.6 only.

## Version 1.20.19

_Released 07/14/21_

- **Bugfix.** Resolved HTTP 500 on malformed inline permissions.

## Version 1.20.18

_Released 07/13/21_

- **Bugfix.** Resolved missing Master Settings in Registry for new accounts.

## Version 1.20.17

_Released 07/12/21_

- **Bugfix.** Fix an issue with multiple deployments using similar prefixes causing deployment failure.

## Version 1.20.16

_Released 07/09/21_

- **Security.** Update Axios for security patching against CVE-2020-28168.

## Version 1.20.15

_Release 06/16/21_

- **Enhancement.** Update Fusebit to node v14.17.2.

## Version 1.20.13

_Released 07/07/21_

- **Enhancement.** Make Aurora error slightly less cryptic.

## Version 1.20.5

_Release 06/26/21_

- **Enhancement.** Patch fusebit mono docker image during docker build.

## Version 1.20.4

_Release 06/24/21_

- **Enhancement.** Further v2 development.

## Version 1.20.2

_Release 06/8/21_

- **Enhancement.** Support for fusebit-authorization-account-id request header specifying the accountId to use when resolving the caller credentials

## Version 1.20.1

_Release 06/5/21_

- **Enhancement.** Further v2 development.
- **Enhancement.** Additional characteristics and parameters are returned from storage queries.

## Version 1.19.15

_Release 06/2/21_

- **Bugfix.** Handle recursive storage list operations without error.

## Version 1.19.13

_Release 05/25/21_

- **Enhancement.** Support serving functions for local development.

## Version 1.19.12

_Release 05/22/21_

- **Enhancement.** Relax function name restrictions to allow capital letters.

## Version 1.19.11

_Release 05/19/21_

- **Enhancement.** Additional storage and RDS improvements.

## Version 1.19.10

_Release 05/18/21_

- **Enhancement.** Move storage to RDS and away from DynamoDB.

## Version 1.19.9

_Release 05/18/21_

- **Enhancement.** Rough-in support for new endpoints around integrations and connectors.

## Version 1.19.8

_Release 05/13/21_

- **Enhancement.** Function list APIs now support returning function tags when `include=all` query parameter is specified.

## Version 1.19.7

_Release 04/26/21_

- **Bugfix.** Resolve an error in function creation where failure would fail to be propagated.

## Version 1.19.6

_Release 04/21/21_

- **Enhancement.** Implement body size limit for x-www-form-encoded Fusebit functions.

## Version 1.19.5

_Release 04/20/21_

- **Enhancement.** Implement body parsing for x-www-form-encoded in Fusebit functions.

## Version 1.19.4

_Release 04/19/21_

- **Bugfix.** Normalized stdout logs to be a single line.

## Version 1.19.3

_Release 04.13.21_

- **Bugfix.** Changed AWS SDK timeout to allow for 120-second execution.

## Version 1.19.2

_Released 04/13/21_

- **Enhancement.** Switched container to run as a service user.

## Version 1.19.1

_Released 04/13/21_

- **Bugfix.** Implement log rotation on the container log to prevent it from overflowing the disk.

## Version 1.19.0

_Released 04/05/21_

Prior to deploying this version, please re-run `fuse-ops setup` and `fuse-ops deployment add` on your deployment with `fuse-ops` version `1.25.0` or greater.

- **Enhancement.** Upgrade default Lambda runtime to NodeJS 14.16.0.

## Version 1.18.24

_Released 04/01/21_

- **Enhancement.** Npm registry now uses a combination of S3 and DynamoDb in order to handle package manifests above 400kb.

## Version 1.18.23

_Released 03/29/21_

- **Bugfix.** Corrected response code from npm cdns to be 400 instead of 503.

## Version 1.18.22

_Released 03/18/21_

- **Enhancement.** Add a maximum concurrency limit per subscription to lambda execution.

## Version 1.18.21

_Released 03/09/21_

- **Enhancement.** Added additional npm cdn: jsdelvr. Traffic split between jsdelvr and unpkg, with fallbacks to one another.

## Version 1.18.20

_Released 03/04/21_

- **Bugfix.** Resolved npm unpublish and revision control bugs.

## Version 1.18.19

_Released 03/02/21_

- **Bugfix.** Capture error when attempting to acquire an invalid JWT key.

## Version 1.18.18

_Released 02/14/21_

- **Bugfix.** Correctly close a connection for the internal npm registry.

## Version 1.18.17

_Released 02/11/21_

- **Bugfix.** Improve the way ElasticSearch handles unknown fields.

## Version 1.18.16

_Released 02/11/21_

- **Bugfix.** Fix audit queries across multiple result pages.

## Version 1.18.15

_Released 02/09/21_

- **Enhancement.** Convert the audit table in DynamoDB to use a better scaling index.
- **Bugfix.** Temporarily rename 'audit' to 'audit2' to manage the migration.

## Version 1.18.14

_Released 1/18/21_

- **Bugfix.** Properly version configuration changes when publishing functions.

## Version 1.18.13

_Released 12/20/20_

- **Bugfix.** Eliminate a potential race allowing functions to execute against previously configured security contexts.

## Version 1.18.12

_Released 12/19/20_

- **Bugfix.** Enforce consistent reads to DynamoDB for operational API calls.
- **Enhancement.** Add a `fusebit.endpoint` in the `ctx` for the endpoint of the Fusebit API.
- **Enhancement.** Add `path` to the `ctx` for function invocations that includes the route under the function from the request.

## Version 1.18.11

_Released 12/14/20_

- **Bugfix.** Resolve ES schema confusion around analytics record schema for the JWT access credentials.

## Version 1.18.10

_Released 12/11/20_

- **Bugfix.** Improve JWT access credential redaction from the function activity analytics pipeline.

## Version 1.18.9

_Released 12/3/20_

- **Bugfix.** Correctly filter npm scopes from specified global entries.
- **Bugfix.** Allow empty strings for `configuration` entries in the function specification.

## Version 1.18.8

_Released 12/1/20_

- **Bugfix.** Treat a `Basic` authentication as invalid for `optional` mode authentication.

## Version 1.18.7

_Released 11/30/20_

- **Bugfix.** Correctly validate user permissions against permissions with mustache parsing.

## Version 1.18.6

_Released 11/26/20_

- **Enhancement.** Support mustache notation in permissions and authorization rule specification.

## Version 1.18.5

_Released 11/25/20_

- **Enhancement.** Improve the build speed for functions.

## Version 1.18.4

_Released 11/24/20_

- **Bugfix.** Separate the logging credential from the `functionPermissions` credentials to avoid accidental credential leak.
- **Bugfix.** Move the functionPermission, authorization, and authentication variables out of the top level and into `security` within the function specification.

## Version 1.18.3

_Released 11/23/20_

- **Bugfix.** Enable old-style functions to run as unauthenticated.

## Version 1.18.2

_Released 11/23/20_

- **Enhancement.** Require supported versions of `fuse` and `fusebit-editor`.

## Version 1.18.1

_Released 11/20/20_

- **Enhancement.** Allow functions to specify caller authentication and authorization requirements.
- **Enhancement.** Include the `accountId` in the function execution `ctx` object.

## Version 1.18.0

_Released 11/18/20_

- **Enhancement.** Support for hierarchical document storage

## Version 1.17.12

_Released 11/17/20_

- **Enhancement.** Enable functions to call Fusebit APIs with permissions specified at function creation.
- **Enhancement.** Annotate realtime log output with it's HTTP method.
- **Enhancement.** Support realtime log output from cron functions.

## Version 1.17.11

_Released 11/05/20_

- **Enhancement.** Registry: Support a private internal npm registry for hosting packages within configured scopes.
- **Enhancement.** Tags: Add version information about directly dependent packages to each function specification.

## Version 1.17.10

_Released 10/09/20_

- **Bug fix.** Fix edge condition in function tag updating.

## Version 1.17.9

_Released 9/30/20_

- **Bug fix.** Scope ElasticSearch queries correctly for region-restricted indexes.

## Version 1.17.8

_Released 9/29/20_

- **Bug fix.** Fix for HTTP 500 when searching for functions using search criteria.

## Version 1.17.7

_Released 09/24/20_

- **Enhancement.** ElasticSearch: Reduce the number of shards per index.
- **Enhancement.** ElasticSearch: Name indexes on month granularity, rather than day, and include the region.

## Version 1.17.6

_Released 9/3/20_

- **Enhancement.** Return computed function tags in the `runtime` object on a function specification.
- **Enhancement.** Support multiple search parameters when querying functions for more complicated filters.

## Version 1.17.5

_Released 9/3/20_

- **Bug fix.** Improve fault tolerance of DynamoDB interface when searching for functions.
- **Enhancement.** Increase automatically generated attributes to include template attributes.
- **Enhancement.** Record environmental version numbers as part of searchable function tags.

## Version 1.17.4

_Released 8/12/20_

- **Enhancement.** Support searching for functions by properties contained in the configuration or metadata of the function.
- **Enhancement.** Return the execution `location` of the function as part of LIST results.

## Version 1.17.3

_Released 7/14/20_

- **Bug fix.** Supply a template for ElasticSearch indexes.

## Version 1.17.2

_Released 6/6/20_

- **Bug fix.** Improve behavior when ElasticSearch is not enabled.

## Version 1.17.1

_Released 6/5/20_

This release requires `fusebit-ops-cli` version `1.23.2` or greater.

- **Bug fix.** Increase default AWS credential validity to 12 hours
- **Enhancement.** Add originating stack details to statistical metadata per request.

## Version 1.17.0

_Released 6/3/20_

Prior to deploying this version, please re-run `fuse-ops setup` and `fuse-ops deployment add` on your deployment with `fuse-ops` version `1.23.0` or greater.

- **Enhancement.** Expose the base URL of the fusebit function as `ctx.baseUrl`.
- **Enhancement.** Support ElasticSearch as a backend for Fusebit analytics.
- **Bug fix.** Fix race condition leading to a resource leak in the handling of requests for real-time logs.

## Version 1.16.1

_Released 5/6/20_

- **Statistics: Include support for grouping HTTP histograms by aggregate 2xx, 3xx, etc.**

## Version 1.16.0

_Released 5/4/20_

- **Support for monitoring and metrics via ElasticSearch** This release adds support for an optional back-end
  Elastic Search service, enabling advanced monitoring and analytics of function execution results and
  performance.
  - This release includes an updated `v1.22` version of the `fuseops-cli`. Please update by downloading the
    new archive and installing via `npm`.
  - This release requires additional foundational artifacts. Please execute `fuse-ops setup` and `fuse-ops deployment add` for hosted releases to create the underlying artifacts correctly.

## Version 1.15.3

_Released 5/2/20_

- **Bug fix** Fix a bug in HTTP PUT function API which prevented the effective compute settings of an existing function to be updated if the only change in the function specification was the compute settings.

## Version 1.15.2

_Released 4/14/20_

- **Bug fix** Fix a bug in APIs that support paging through results which resulted in an occasional HTTP 500 error response. The bug was triggered by a complex set of circumstances involving the specification of the limit when accessing multiple pages of data.

## Version 1.15.1

_Released 3/26/20_

- **Real-time logging improvements** The real-time logging endpoint now returns information about errors returned from Fusebit functions as well as unhanded exceptions thrown by Fusebit function code.

## Version 1.15.0

_Released 3/20/20_

- **Feature** Improve support for `async` functions with a new async-specific signature: `async (ctx)`,
  discarding the callback parameter.

- **Bug fix** Resolve conflicting usage models for non-async functions by requiring a call to the `cb`
  parameter, discarding any value returned from the function directly.

## Version 1.14.4

_Released 3/3/20_

- **Performace improvements** Improve performance of CRUD operations on clients, users, and issuers.

## Version 1.14.3

_Released 2/28/20_

- **Limit increase** Increase default limit for the size of the body of the function execution request from 100KB to 500KB.

## Version 1.14.2

_Released 1/22/20_

- **Bug fix** Mitigation for a race condition in keep-alive timing between AWS ALB and Fusebit server that resulted in sporadic HTTP 502 responses.

## Version 1.14.1

_Released 1/13/20_

- **Bug fix** Fix a bug in processing of CRON settings when creating or updating a CRON job.

## Version 1.14.0

_Released 1/8/20_

- **Enable OAuth initialization tokens** Add support for creating initialization tokens that allow the user identity to be
  established using an existing OAuth issuer with trust pre-configured in the system.

## Version 1.13.4

_Released 12/27/19_

- **Bug fix.** Modify CORS policy for management APIs to allow generation of init tokens for users and clients.

## Version 1.13.3

_Released 12/20/19_

- **Bug fix.** Modify CORS policy for management APIs to allow PATCH requests.

## Version 1.13.2

_Released 10/21/19_

- **Bug fix.** Fixed a bug in list APIs that affected the ability to page through results when secondary indices of the storage were used to query data.

## Version 1.13.1

_Released 10/21/19_

- **Improved performance of accessing the audit trail.** Optimized usage of indexes to improve performance of accessing filtered audit trail.

## Version 1.13.0

_Released 10/3/19_

- **Improved support for real time logging.** Function execution requests no longer require the `x-fx-logs` request header in order to be captured by real-time logging. Real-time logging for requests is enabled if there is at least one pending request for real-time logs of the specific function or boundary of that function.

## Version 1.12.0

_Released 7/9/19_

- First ever officially documented release of the HTTP API 🚀
- Only function execution requests with `x-fx-logs=1` query parameter or `x-fx-logs` HTTP request header will have the output of their `console.log` and `console.error` made available via the real-time logs endpoint
- Data written directly to `process.stdout` or `process.stderr` is no longer captured by real-time logs.
