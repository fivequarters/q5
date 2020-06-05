---
parent: Release Notes
nav_order: 4
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

<!--
## Version 1.17.1

_ Released X/X/20_

- **Bug fix.** Increase default AWS credential validity to 12 hours
-->

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
