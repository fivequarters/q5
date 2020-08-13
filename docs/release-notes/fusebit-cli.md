---
parent: Release Notes
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

## Version 1.8.3

_Released 8/12/20_

- **Enhancement**. Enable `fuse function ls --search` to search for functions by properties contained in the configuration or metadata of the function.

## Version 1.8.2

_Released 7/29/20_

- **Enhancement**. Support for deploying functions with files in subdirectories in `fuse function deploy -d`.
- **Typo Fix**. Eliminate several typographic errors in the help text.
- **Require Node Version**. Require NodeJS v10+.
- **Bug Fix**. Handle errors in `fuse function deploy` when in an empty directory better.
- **Remove Editor Scrollbars**. Eliminate unnecessary scrollbars in the editor.

## Version 1.8.1

_Released 3/26/20_

- **Support exceptions in real-time logs**. The `fuse function log` command now displays information about errors returned from Fusebit functions as well as unhanded exceptions thrown by Fusebit function code.

## Version 1.8.0

_Released 1/7/20_

- **Support for OAuth init tokens**. The `fuse init` command now accepts init tokens containing the OAuth Device Flow settings that enable the user to authenticate using Oauth.
- **Profile removal bug fix**. The `fuse profile rm` command is now correctly removing cached access tokens for OAuth profiles.

## Version 1.7.0

_Released 11/15/19_

- **Support for templates**. The `fuse function edit` command now allows creating or overriding functions from a template stored on Github, using `--template {org}/{repo}[/{directory}]` option. For sample templates, check [fusebit/samples](https://github.com/fusebit/samples) repository.

## Version 1.6.0

_Released 11/13/19_

- **Support for exporting credentials**. The `fuse profile get` command now allows exporting a profile including private credential information to facilitate programmatic access to Fusebit APIs. Use with `-o json --includeCredentials` or `-o json64 --includeCredentials`.
- **Remove profile add command**. The `fuse profile add` command was removed - its functionality was redundant with `fuse profile cp` and `fuse profile update`.
- **Improve output**. The output of the `fuse profile ls` and `fuse profile get` was improved to provide better experience for differentiating between PKI and OAuth profiles.
- **Improved OAuth initialization support**. The `fuse init` command supports selection of the source OAuth profile when used with a settings file from a Github repository or a URL. It also performs the initial OAuth device flow to authenticate the user for better detection of authorization issues.

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
