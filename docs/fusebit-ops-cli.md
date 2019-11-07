---
nav_order: 5
title: Fusebit Operations CLI
---

<!-- prettier-ignore-start -->
# Fusebit Operations CLI
{: .no_toc }
<!-- prettier-ignore-end -->

The Fusebit operations CLI enables customers to create a private deployment of the Fusebit stack on their own cloud infrastructure. This can help address compliance, data locality and other concerns. The operations CLI does not apply to customers running on Fusebit public cloud infrastructure.

All public releases of the Fusebit Operations CLI are documented here, including notable changes made in every release. CLI releases follow the [Semantic Versioning 2.0 specification](https://semver.org/). For more information on the Fusebit versioning strategy, see [here](http://fusebit.io/docs/integrator-guide/versioning).

<!-- prettier-ignore
1. TOC
{:toc}
-->

## Version 1.16.0

_Released 11/5/19_

- **Fix regression in CRON deployment** Fixed a bug that prevented `fuse-ops deployment add` from deploying the CRON infrastructure.

## Version 1.15.0

_Released 10/21/19_

- **Transition from Node.js 8 to 10.** The internal infrastructure supporting CRON and monitoring components is migrated from Node.js 8 to 10 in light of Node.js 8 end of life 12/2019.

**NOTE** You need to run `fuse-ops deployment add` on all your deployments to upgrade your CRON and monitornig components from Node.js 8 to 10.

## Version 1.14.0

_Released 10/14/19_

- **Support for custom AMIs.** The `fuse-ops stack add` command now allows the specification of a custom AMI ID to use instead of the official Ubuntu AMI.

## Version 1.13.0

_Released 10/3/19_

- **Improved support for real time logging.** The `fuse-ops deployment add` command now provisions an additional DynamoDB table `{deployment}.key-value` used by real-time logging features introduced in API version 1.13.0.

**NOTE** Before deploying stacks of version 1.13.0 or above, you need to run `fuse-ops deployment add` on all your deployments. This will create the missing DynamoDB tables and enable stacks with version 1.13.0 to work correctly.

## Version 1.12.0

_Released 9/18/19_

First ever release of the operations CLI 🚀
