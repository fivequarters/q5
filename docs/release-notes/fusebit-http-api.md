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

## Version 1.18.6

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
