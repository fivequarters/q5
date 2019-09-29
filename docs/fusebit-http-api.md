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
1. TOC
{:toc}

## Version 1.0.0

_Released 7/9/19_

- First ever official release of the HTTP API 🚀
- Only function execution requests with `x-fx-logs=1` query parameter or `x-fx-logs` HTTP request header will have the output of their `console.log` and `console.error` made available via the real-time logs endpoint
- Data written directly to `process.stdout` or `process.stderr` is no longer captured by real-time logs.
