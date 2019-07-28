The Fusebit CLI is a command-line tool for the management of Fusebit accounts, users, functions and more. For more information about the Fusebit platform, see [https://fusebit.io](https://fusebit.io)

# Install

The Fusebit CLI is built on [node.js](https://nodejs.org), which is a pre-requisite you need to install first. Then, run the following command:

```bash
npm install -g @fusebit/cli
```

## Initialization

To start using the CLI against your deployment, you will need a one-time initialization token, which will be provided during onboarding or when you are given access.

```bash
fuse init {initialization-token}
```

After the command completes, a local profile is created and stored on your machine under `~/.fusebit`. The profile contains private connection information that enables the CLI to communicate with the Fusebit service, and should not be shared.

A profile can also _optionally_ specify a Fusebit **boundary** and **function**, which will result in all commands that take those as parameters to default to the values provided in the profile. If you frequently work within the same boundary or on the same function, this is a useful way to save time. Multiple profiles can be created with combinations of boundary and function defaults via the `fuse profile` command.

## Commands

The Fusebit CLI supports the following top-level commands. Each command displays further information when invoked with no parameters:

- `fuse init`: Initialize the CLI with a one-time token provided by account administrator
- `fuse function`: Manage functions, view function logs, download functions for local development. More details here: [Local Development with the Fusebit CLI]({{ site.baseurl}}{% link authoring-guide/local-development.md %})
- `fuse profile`: Manage profiles
- `fuse token`: Generate a short-lived access token to be used with the HTTP API
- `fuse user`: _(account admins)_ Retrieve and manage users and their identities and access. More details here: [Managing End-Users within the Fusebit Platform]({{ site.baseurl}}{% link integrator-guide/setting-up-your-team.md %})
- `fuse client`: _(account admins)_ Retrieve and manage clients and their identities and access. More details here: [Setting up your Team]({{ site.baseurl}}{% link integrator-guide/backend-integration.md %}#managing-end-users-within-the-fusebit-platform)
- `fuse issuer`: _(account admins)_ Retrieve and manage trusted issuers associated with the account
- `fuse version`: Return the version of the Fusebit CLI

## Update

To update the Fusebit CLI to the latest version, use:

```bash
npm install -g @fusebit/cli
```

## Uninstall

To uninstall the Fusebit CLI, use the following command:

```bash
npm uninstall -g @fusebit/cli
```

For security reasons, you may also choose to remove any profiles that were stored locally:

```bash
rm -r ~/.fusebit
```
