The EveryAuth CLI is a command-line tool for the [EveryAuth Express middleware](https://github.com/fusebit/everyauth-express/), allowing for the management of services, tokens, and more.

## Install

The EveryAuth CLI is built on [node.js](https://nodejs.org), which is a pre-requisite you need to install first. Then, run the following command:

```bash
npm install -g @fusebit/everyauth-cli
```

## Initialization

To start using the CLI against your deployment, create a new profile and integration environment:

```bash
everyauth init
```

After the command completes, a local profile is created and stored on your machine under `~/.fusebit`. The profile contains private connection information that enables the CLI to communicate with the EveryAuth service, and should not be shared.

## Commands

The EveryAuth CLI supports the following top-level commands. Each command displays further information when invoked with no parameters:

#### everyauth init

Performs one-time initialization of EveryAuth on a developer machine. This command will create a free Fusebit account and store the credentials necessary to access it in your home directory's `~/.fusebit/settings.json` file. Keep this file secret. You can also move the `.fusebit` directory to a new machine from which you want to access your EveryAuth configuration, like a CI/CD box or a second development machine. 

#### everyauth profile export

Exports to `stdout` a JSON-encoded profile object which can be used with `everyauth profile import`, or
set in the environment after base64 encoding within `EVERYAUTH_PROFILE_JSON` to support generating keys in
production to authenticate to the EveryAuth backend.

**Example:** Encode the profile to generate short-lived JWT keys dynamically in production, and store it in a
`.env` file.

```
echo EVERYAUTH_PROFILE_JSON=`everyauth profile export | base64` >> .env
```

#### everyauth profile import

Supports importing, from `stdin` or a file, a previously existing profile.

#### everyauth token

Generates a JSON-encoded JWT that, once base64-encoded, can be placed within the `EVERYAUTH_TOKEN` environment variable to
be automatically used by the middleware to communicate with the EveryAuth backend.

Supports a `--expires` parameter that allows for a custom expiration time specified via standard
[ms](https://www.npmjs.com/package/ms) interval encoding.  The default expiration interval is `2h` (two hours).

**Example:** Generate a token valid for 12 weeks, and store it in a `.env` file.

```
echo EVERYAUTH_TOKEN=`everyauth token --expires 12w | base64` >> .env
```

#### everyauth service ls

Lists services available to use from your app. See the [Supported services](#supported-services) section for details on the usage of individual services. 

#### everyauth service set

Configures a specific service. This can be used to specify your custom OAuth client ID or secret or a custom set of scopes you want to request the authorization for. See the [Supported services](#supported-services) section for details on the usage of individual services. 

#### everyauth service get

Get the current configuration of a specific service and the OAuth callback URL necessary to set up a custom OAuth application with that service. 

#### everyauth service add

Add a new service. 

#### everyauth service rm

Remove existing service.

#### everyauth service log

Get logs of an existing service. 

#### everyauth identity ls

List existing identities for a specific service (users who authorized your app to use the service on their behalf).

#### everyauth identity get

Get details of a specific identity of a particular service.

#### everyauth identity rm

Remove a specific identity of a particular service. 

#### everyauth version

Display CLI version.

## Update

To update the EveryAuth CLI to the latest version, use:

```bash
npm install -g @fusebit/everyauth-cli
```

## Uninstall

To uninstall the EveryAuth CLI, use the following command:

```bash
npm uninstall -g @fusebit/everyauth-cli
```

For security reasons, you may also choose to remove any profiles that were stored locally:

```bash
rm -r ~/.fusebit
```
