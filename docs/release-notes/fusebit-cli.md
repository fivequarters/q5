---
parent: Release Notes
nav_order: 1
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

## Version 1.24.0

_Released 6/10/22_

- **Enhancement.** Add support for the routes element in fusebit.json

## Version 1.23.12

_Released 6/3/22_

- **Bugfix.** Allow for profiles without explicit subscriptions.

## Version 1.23.10

_Released 5/2/22_

- **Bugfix.** Update fuse function serve with the newest fusetunnel to support private deployments of fusetunnel.

## Version 1.23.9

_Released 4/27/22_

- **Bugfix.** EveryAuth: Improve support for alternative operating systems.

## Version 1.23.8

_Released 4/25/22_

- **Bugfix.** Fix issue blocking new OAuth-based profiles from being initialized.
- **Enhancement.** EveryAuth: Change the default `token` output to provide a `base64` encoded object.

## Version 1.23.6

_Released 4/21/22_

- **Enhancement.** EveryAuth: Support the new command `profile import` and `profile export`
- **Enhancement.** EveryAuth: Support the new command `token` to generate a token, with an optional `--expires` parameter to control the lifetime.

## Version 1.23.5

_Released 4/14/22_

- **Enhancement.** Upgrade semver used in the package to 7.3.7.
- **Enhancement.** EveryAuth: Create a useful error message when running prior to `init`.
- **Enhancement.** EveryAuth: Support for specifying an email on `init` and capturing OS username as first name.

## Version 1.22.1

_Released 4/13/22_

- **Enhancement.** Upgrade superagent used in the package to 7.1.1.

## Version 1.22.0

_Released 4/4/22_

- **Enhancement.** Support the `everyauth` CLI.

## Version 1.21.4

_Released 4/7/22_

- **Security.** Patch Axios against CVE-2021-3749.

## Version 1.21.3

_Released 4/4/22_

- **Enhancement.** Name entities created via the feed based on the `feed.id` rather than `my-integration`.

## Version 1.21.1

_Released 2/23/22_

- **Enhancement.** Correct spelling mistakes.

## Version 1.21.0

_Released 2/7/22_

- **Enhancement.** Support monitoring, logging, and tracing using Grafana

## Version 1.20.1

_Released 1/11/22_

- **Enhancement.** Fusebit Code Editor configuration options added to functions and integrations.

## Version 1.20.0

_Released 12/13/21_

- **Enhancement.** Support binary files encoded using 'base64' in function, integration, and connector specifications.

## Version 1.19.1

_Released 11/23/21_

- **Enhancement.** Improve stdout flushing for large payloads.

## Version 1.19.0

_Released 11/22/21_

- **Enhancement.** Migrating to the auth.fusebit.io custom domain on our Auth0 tenant.

## Version 1.18.2

_Released 11/19/21_

- **Enhancement.** Extend the generated token to include a profile claim.

## Version 1.18.1

_Released 11/15/21_

- **Enhancement.** Initialize an example from a published entry in the integration or connector feeds.

## Version 1.17.0

_Released 11/14/21_

- **Security.** Update various dependencies with critical CVEs.

## Version 1.16.1

_Released 11/09/21_

- **Enhancement.** Add support for specifying custom authorization account Id and authorization account Id override through FUSEBIT_AUTHORIZATION_ACCOUNT_ID and FUSEBIT_ACCOUNT_ID environment variables.

## Version 1.16.0

_Released 10/21/21_

- **Enhancement.** Add support for accessing historical logs through `fuse log` command.

## Version 1.15.2

_Released 10/21/21_

- **Bugfix.** Correctly report errors generated during connector or integration deploy.

## Version 1.15.1

_Released 10/11/21_

- **Bugfix.** Fixes compatibility issues with npm 7.

## Version 1.15.0

_Released 10/08/21_

- **Enhancement.** Rename 'instance' to 'install'.

## Version 1.14.4

_Released 09/18/21_

- **Enhancement.** Support importing and exporting individual profiles.

## Version 1.14.0

_Released 09/09/21_

- **Enhancement.** Support for configuration settings in `fuse function serve`. The locally running function will now
  have the `ctx.configuration` set to the values defined in the `.env` local file.
- **Bugfix.** Allow the locally running function to load a set of npm modules that are isolated from the modules
  of fuse CLI. This enables certain mocking scenarios.

## Version 1.13.0

_Released 09/02/21_

- **Enhancement.** Improvements in `fuse storage` commands.

## Version 1.12.2

_Released 09/02/21_

- **Bugfix.** Cancelling an OAuth flow from the CLI does not prevent subsequent OAuth flows for the same account.

## Version 1.11.2

_Released 08/25/21_

- **Enhancement.** Add a check to help preventing the deployment of invalid integrations and connectors.

## Version 1.11.1

_Released 08/23/21_

- **Bugfix.** Fix compatibility issues with npm 7.

## Version 1.11.0

_Released 08/18/21_

- **Enhancement.** Add `fuse integration test` command to simplify testing an integration.

## Version 1.10.1

_Released 08/18/21_

- **Bugfix.** Fix the rendering of the QR code for the OAuth Device Flow on Windows.

## Version 1.10.0

_Released 08/17/21_

- **Enhancement.** Using the tool without initialization will set up an OAuth device flow profile for the primary Fusebit deployment in the US, including provisioning a new Fusebit account during the authentication process.
- **Enhancement.** Ability to specify custom resource names and custom actions when granting user and client permissions.

## Version 1.9.17

_Released 07/09/21_

- **Bugfix** Fixed issue causing `fuse function serve` to not shut down tunnel on exit.

## Version 1.9.13

_Released 07/09/21_

- **Security** Update Axios for security patching against CVE-2020-28168.

## Version 1.9.9

_Released 6/24/21_

- **Enhancement.** Further v2 development.

## Version 1.9.8

_Released 6/21/21_

- **Bugfix.** Fix an bug on logging in to the fuse npm service on Windows.

## Version 1.9.7

_Released 6/4/21_

- **Enhancement.** Support querying storage values.

## Version 1.9.6

_Released 6/4/21_

- **Enhancement.** Added more verbose output for diagnostics.
- **Bugfix.** Fixed formatting of dates to be locale-agnostic.

## Version 1.9.4

_Released 5/25/21_

- **Enhancement.** Support serving functions for local development.

## Version 1.9.3

_Released 5/22/21_

- **Enhancement.** Relax function name restrictions to allow capital letters.

## Version 1.9.2

_Released 5/11/21_

- **Enhancement.** The `fuse function deploy` now allows specification of files or directories to ignore using the `--ignore` option. Also, `.git` and `.gitignore` are ignored by default.

## Version 1.9.1

_Released 4/28/21_

- **Bugfix.** Correctly handle error in erroneous log message parsing.

## Version 1.9.0

_Released 3/29/21_

- **Enhancement.** Remove the specified `"engine": "10"` clause from the default function template.

## Version 1.8.13

_Released 03/29/21_

- **Bugfix.** Fixed argument slice range for `npm exec` command.
- **Enhancement.** Function publishes now ignore the `node_modules` directory in the event that an `npm install` command was run.

## Version 1.8.12

_Released 12/3/20_

- **Bugfix.** Remove unnecessary `--profile` option specifications in the `npm registry scope` command.

## Version 1.8.11

_Released 11/24/20_

- **Bugfix.** Move the functionPermission, authorization, and authentication variables out of the top level and into `security` within the function specification.

## Version 1.8.10

_Released 11/20/20_

- **Enhancement.** Extend the list of permissions that can be set for user and client identities.
- **Enhancement.** Support setting function `authorization` and `authentication` in the specification.

## Version 1.8.9

_Released 11/17/20_

- **Enhancement.** Enable functions to call Fusebit APIs with permissions specified at function creation.
- **Enhancement.** Annotate realtime log output with it's HTTP method.
- **Enhancement.** Support realtime log output from cron functions.
- **Enhancement.** Support the environmental override `FUSEBIT_EDITOR_IP` when editing functions via `fuse function edit` on a remote host.

## Version 1.8.8

_Released 11/05/20_

- **Enhancement.** Support private npm registries through `fuse npm`, including `fuse npm login` to use normal `npm` commands.
- **Enhancement.** Re-evaluate, and possibly rebuild, a function's calculated dependencies through `fuse function rebuild`.

## Version 1.8.7

_Released 10/22/20_

- **Enhancement**. Support the `--subscription` override to all `fuse function` commands.

## Version 1.8.6

_Released 9/9/20_

- **Bug Fix**. Support missing tags for older server versions.

## Version 1.8.5

_Released 9/6/20_

- **Enhancement**. Report the tags of a function in `fuse function get`.
- **Enhancement**. Support multi-criteria search in `fuse function ls`.

## Version 1.8.4

_Released 9/3/20_

- **Bug Fix**. Add `subscription` to the output of `fuse profile get -o json`.

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
