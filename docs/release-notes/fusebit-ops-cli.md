---
parent: Release Notes
nav_order: 6
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

## Version 1.24.12

_Released 11/24/20_

- **Bugfix.** Separate logging credentials from `functionPermission` credentials to eliminate credential leak.

## Version 1.24.11

_Released 11/20/20_

- **Enhancement.** Update to cron executor to fully populate function `ctx` object.

## Version 1.24.10

_Released 11/17/20_

- **Enhancement.** Enable cron functions to call Fusebit APIs with permissions specified at function creation.
- **Enhancement.** Support realtime log output from cron functions.

## Version 1.24.9

_Released 11/05/20_

- **Enhancement.** Support a private global npm registry against a specific account for hosting deployment-wide packages within specific scopes.

## Version 1.24.8

_Released 9/23/20_

- **NFC.** Correct output on the `action regenTags` command to accurately reflect the number of subscriptions loaded.

## Version 1.24.7

_Released 9/22/20_

- **Enhancement.** Record the `fuse-ops` version within DynamoDB for artifacts created.

## Version 1.24.6

_Released 9/12/20_

- **Bug Fix.** Resolve an issue in the cron scheduling system that prevented event scheduling.

## Version 1.24.5

_Released 9/6/20_

- **Enhancement.** Support `fuse-ops action clearTags` to remove legacy tags during upgrade processes.

## Version 1.24.4

_Released 9/1/20_

- **Enhancement.** Support `fuse-ops action regenTags` to rebuild internal indicies during upgrades.

## Version 1.24.3

_Released 8/25/20_

- **Bugfix.** Fix internal analytics issue with cross-region deployments.

## Version 1.24.2

_Released 7/17/20_

- **Bugfix.** Eliminate unused option from ElasticSearch generated configuration for GovCloud support.

## Version 1.24.1

_Released 7/1/20_

- **Bugfix.** Record cron executions in the analytics with valid status codes.

## Version 1.24.0

- **Enhancement.** Support for managing Fusebit Portals with `fuse-ops portal`.

## Version 1.23.4

- **Bugfix.** Adjust permissions of `fusebit-function` to address staticIP support.

## Version 1.23.3

_Released 6/9/20_

- **Bugfix.** Allow the `fusebit-analytics` IAM role to scan subscription information in multiple regions.

## Version 1.23.2

_Released 6/5/20_

- **Enhancement.** Support recording additional metadata about stack version in analytics.

## Version 1.23.1

_Released 6/4/20_

- **Bugfix.** Resolve spurious error message during stack deployment.

## Version 1.23.0

_Released 6/3/20_

For this version to take effect, please re-run `fuse-ops setup` and `fuse-ops deployment add` on your deployment.

- **ElasticSearch Support.** Deploy an Elastic Search cluster through `fuse-ops` in AWS and acquire analytics via API, or use a pre-existing ElasticSearch cluster.

## Version 1.22.1

_Released 5/19/20_

- **Idle Timeout Increase.** Increased the default idle timeout of the application load balancer to 120 seconds. For this setting to take effect, please re-run `fuse-ops deployment add` on your deployment.
- **Input Validation.** Disallow network names that include non-alphanumeric characters.
- **Cron Bugfix.** Resolve an issue with the cron scheduler.

## Version 1.21.0

_Released 1/23/20_

- **GovCloud Support** Support for deployments on AWS GovCloud.

## Version 1.20.1

_Released 12/11/19_

- **Bug fix** Prevent attempted creation of a VPC and subnets on `fuse-ops network` commands that do not specify a pre-existing VPC and network.

## Version 1.20.0

_Released 12/4/19_

- **Support pre-existing VPC and subnets** Enable the specification of a pre-existing VPC and subnets in `fuse-ops network add`.

## Version 1.19.0

_Released 11/19/19_

- **Support for IAM permissions boundary** Enable the specification of a custom ARN of an IAM permissions boundary to be used when creating roles in `fuse-ops setup`.

## Version 1.18.0

_Released 11/12/19_

- **Support for custom AWS credentials provider** Enable the specification of a custom AWS credentials provider in `fuse-ops init`.

## Version 1.17.0

_Released 11/7/19_

- **Reduce AWS encryption costs** Optimize DynamoDB encryption settings to reduce encryption costs.

**NOTE** You need to run `fuse-ops setup` on your account and `fuse-ops deployment add` on all your deployments to upgrade DynamoDB settings configuration.

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
