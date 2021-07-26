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

## Version 1.28.0

_Released 07/23/21_

- **Enhancement** Introduces the ability to set a feature flag on subscriptions to either block or allow them to use the static IP feature on Fusebit function.

## Version 1.27.18

_Released 07/21/21_

- **Bugfix** Fuse-ops will no longer break if there are deployments of the same name in different regions.

## Version 1.27.17

_Released 07/16/21_

- **Enhancement** Integration Sessions can now be ran against an existing set of Instances and Identities in order to update their values

## Version 1.27.16

_Released 07/13/21_

- **Bugfix** Fuse-ops backup restore no longer fails when the cluster is not found.

## Version 1.27.15

_Released 07/13/21_

- **Enhancement** Change fuse-ops backup ls command to include the region of the backup.

## Version 1.27.14

_Released 07/12/21_

- **Bugfix** Fix an issue with multiple deployments using similar prefixes causing deployment failure.

## Version 1.27.13

_Released 07/09/21_

- **Security** Update Axios for security patching against CVE-2020-28168.

## Version 1.27.10

_Released 07/07/21_

- **Enhancement** Make Aurora error slightly less cryptic.

## Version 1.27.9

_Released 06/30/21_

- **Bugfix.** Attach function summary to cron based functions.

## Version 1.27.8

_Released 06/24/21_

- **Enhancement.** Further v2 development.

## Version 1.27.7

- **Enhancement.** Add Encryption On EC2 Disks.
- **Bugfix.** Aurora Backup Now Properly Updates Secrets Manager.
- **Enhancement.** Switch EC2 to GP3 volumes.

## Version 1.27.6

- **Enhancement.** Support backup/restore for RDS.

## Version 1.27.5

_Released 06/08/21_

- **Bugfix.** Don't remove Route53 validation records after the certificate is issued during a `fuse-ops domain add`.

## Version 1.27.3

_Released 05/19/21_

- **Enhancement.** Support new types in RDS.

## Version 1.27.2

_Released 05/18/21_

- **Bugfix.** Further RDS tooling support.

## Version 1.27.1

_Released 05/12/21_

- **Enhancement.** Migration tool to move data from DynamoDB storage to Aurora.

## Version 1.27.0

_Released 05/12/21_

- **Enhancement.** Add backup/restore deployment support.

## Version 1.26.0

_Released 04/08/21_

For this version to take effect, please re-run `fuse-ops setup` and `fuse-ops deployment add` on your deployment.

- **Enhancement.** Support for Aurora PostgreSQL database.

## Version 1.25.2

_Release 04/26/21_

- **Bugfix.** Address several potential errors in deployment creation.

## Version 1.25.2

_Release 04/16/21_

- **Bugfix.** Increased load balancer timeout to 125 seconds to allow 120-second function execution.

## Version 1.25.1

_Released 04/13/21_

- **Bugfix.** Implement log rotation on the container log to prevent it from overflowing the disk.

## Version 1.25.0

_Released 03/29/21_

- **Enhancement.** Upgrade to NodeJS 14.16.0.
- **Enhancement.** Upgrade to Docker Container 14.16.0-alpine3.13
- **Enhancement.** Upgrade to EC2 OS Image Ubuntu 20.04.

## Version 1.24.19

_Released 03/17/21_

- **Enhancement.** Add a maximum concurrency limit per subscription to lambda execution.

## Version 1.24.18

_Released 02/09/21_

- **Enhancement.** Convert the audit table in DynamoDB to use a better scaling index.
- **Bugfix.** Temporarily rename 'audit' to 'audit2' to manage the migration.

## Version 1.24.17

_Released 01/14/21_

- **Bugfix.** Resolve deprecation issued by AWS for AWSLambdaFullAccess.

## Version 1.24.16

_Released 01/13/21_

- **Bugfix.** Eliminate a potential race allowing functions to execute against previously configured security contexts.

## Version 1.24.15

_Released 12/18/20_

- **Bugfix.** Enforce consistent reads to DynamoDB for table access operations.
- **Bugfix.** Normalize output format control to `--output,-o`, removing the `--format,-f` option.
- **Enhancement.** Add a `fusebit.endpoint` in the `ctx` for the endpoint of the Fusebit API.
- **Enhancement.** Add `baseUrl` to the `ctx` for function invocations that includes the full function HTTP endpoint being invoked.
- **Enhancement.** Add `path` to the `ctx` for function invocations that includes the route under the function from the request.

## Version 1.24.14

_Released 12/14/20_

- **Bugfix.** Resolve ES schema confusion around analytics record schema for the JWT access credentials.

## Version 1.24.13

_Released 12/11/20_

- **Bugfix.** Improve JWT access credential redaction from the function activity analytics pipeline.

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
