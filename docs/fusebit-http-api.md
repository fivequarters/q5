---
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
