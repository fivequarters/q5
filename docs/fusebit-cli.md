---
nav_order: 2
title: Fusebit CLI
---

<!-- prettier-ignore-start -->
# Fusebit CLI
{: .no_toc }
<!-- prettier-ignore-end -->

The Fusebit CLI enables customers to manage functions created on the platform and to administer users and their permissions.

All public releases of the Fusebit CLI are documented here, including notable changes made in every release. CLI releases follow the [Semantic Versioning 2.0 specification](https://semver.org/). For more information on the Fusebit versioning strategy, see [here](http://fusebit.io/docs/integrator-guide/versioning).

<!-- prettier-ignore -->
<!-- 1. TOC
{:toc} -->

## Version 1.5.0

_Released 11/11/19_

- **Support for granting additional permissions.** The `fuse client access add` command now allows granting the `audit:get` actions, which enable the user to access the audit trail of an account.
- **Bug fix.** Fixed an issue in access token caching logic that sometimes prevented timely renewal of expired access tokens.

## Version 1.4.0

_Released 11/4/19_

- **Support for OAuth device flow.** Added support for user authentication using OAuth 2.0 device flow.

## Version 1.3.0

_Released 10/23/19_

- **Permission command improvements.** The `fuse user access add` command now allows specification of the Fusebit subscription, making it useful for account-level administrative actions.

## Version 1.2.0

_Released 10/21/19_

- **Support for granting additional permissions.** The `fuse user access add` command now allows granting the `audit:get` actions, which enable the user to access the audit trail of an account.

## Version 1.1.0

_Released 10/17/19_

- **Support for granting additional permissions.** The `fuse user access add` command now allows granting the `subscription:get` and `account:get` actions, which enable the user to list subscriptions and get account details.

## Version 1.0.3

_Released 10/3/19_

- **Improved support for real time logging.** As of API release 1.13.0, requests do not require the `x-fx-logs` request header in order to be captured by real-time logging. This change removes a note printed out by the `fuse function logs` command that required requests to specify `x-fx-logs` request header.

## Version 1.0.2

_Released 7/18/19_

- All of the command output and formatting has been polished, making it easier to read and copy sections of text
- Many command arguments and options were tweaked to be more consistent across the tool. See the `--help` of each command for details.
- Every command now supports an output format of JSON with the `--output json` option. Some crucial commands also support `--output raw` which will provide a single value, useful for scripting
- Every command now supports a `--quiet` option. When enabled, the CLI will not ask for confirmation before updating resource state
- A new `fuse profile add` command will create a new profile from your current default profile. You can set the boundary and function to apply to the new profile using options. This is easier than using fuse profile cp and fuse profile update
- The `fuse profile default` command has been replaced with the `fuse profile get` and `fuse profile set` commands. The `fuse profile get` command will get details of the current default profile - including the user and the access the profile has. Use the fuse profile set command to set a new profile as the default profile
- Previously, each of the `fuse function *` commands would write/read the boundary id and function id in the `fusebit.json` file. So if you downloaded a function, the boundary id and function id were saved and the `fuse function deploy` command would use these values if the command was executed without any options set. To reduce confusion, we have removed this mechanism. All of the function commands will now only use the current set profile and command options to determine the boundary id and function id to act upon.

## Version 0.0.7

_Released 7/3/19_

- CLI renamed to `fuse`, available via npm at `@fusebit/cli`
- When using `fuse function get -download`, the `.fusebit/function.json` file is now `fusebit.json` at the root of the folder where the function is downloaded
- To view real-time logs via `fuse function log`, the `x-fx-logs=1` query parameter or `x-fx-logs` HTTP request header needs to now be added to outgoing requests
