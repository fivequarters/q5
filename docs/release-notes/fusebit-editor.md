---
parent: Release Notes
nav_order: 2
title: Fusebit Editor
---

<!-- prettier-ignore-start -->
# Fusebit Editor
{: .no_toc }
<!-- prettier-ignore-end -->

The Fusebit editor provides a browser-based IDE for editing Fusebit functions.

All public releases of the Fusebit editor are documented here, including notable changes made in every release. Editor releases follow the [Semantic Versioning 2.0 specification](https://semver.org/). For more information on the Fusebit versioning strategy, see [here](http://fusebit.io/docs/integrator-guide/versioning).

<!-- prettier-ignore -->
<!-- 1. TOC
{:toc} -->

## Version 2.4.0

_Released 02/08/22_

- **Enhancement.** Support monitoring, logging, and tracing using Grafana

## Version 2.3.0

_Released 12/13/21_

- **Enhancement.** Support binary files encoded using 'base64' in function, integration, and connector specifications.

## Version 2.2.1

_Released 10/01/21_

- **Enhancement.** Update Monaco editor to v0.28.1

## Version 2.1.1

_Released 9/30/21_

- **Bugfix.** Remove wordBasedSuggestions settings that was breaking the editor autocomplete experience

## Version 2.1.0

_Released 9/28/21_

- **Enhancement.** Improve IntelliSense support for SDK libraries, integrations and npm packages

## Version 2.0.3

_Released 9/2/21_

- **Enhancement.** Upgrade superagent.

## Version 2.0.1

_Released 7/9/21_

- **Enhancement.** Support for v2 component editing.

## Version 1.5.0

_Released 3/29/21_

- **Enhancement.** Remove the specified `"engine": "10"` clause from the default function template.

## Version 1.4.6

- **Enhancement.** Add a `fusebit.endpoint` in the `ctx` for the endpoint of the Fusebit API.
- **Enhancement.** Add `baseUrl` to the `ctx` for function invocations that includes the full function HTTP endpoint being invoked.
- **Enhancement.** Add `path` to the `ctx` for function invocations that includes the route under the function from the request.

## Version 1.4.5

_Released 11/24/20_

- **Bugfix.** Move the functionPermission, authorization, and authentication variables out of the top level and into `security` within the function specification.

## Version 1.4.4

_Released 11/20/20_

- **Enhancement.** Enable functions to restrict the caller based on permissions using the `authorization` and `authentication` fields in the function specification.
- **Enhancement.** Include the `accountId` in the function execution `ctx` object.

## Version 1.4.3

_Released 11/17/20_

- **Enhancement.** Enable functions to call Fusebit APIs with permissions specified at function creation.
- **Enhancement.** Annotate realtime log output with it's HTTP method.
- **Enhancement.** Support realtime log output from cron functions.

## Version 1.4.1

_Released 6/3/20_

- **Bugfix.** Upgrade the included version of `superagent` to 5.2.2.

## Version 1.4.0

_Released 5/14/20_

- **Enhancement.** Enable creating individual editor panels.
- **Enhancement.** Change the default light theme to have more visible panel breaks.
- **Enhancement.** Eliminate unnecessary scrollbars in the style sheet.

## Version 1.3.1

_Released 5/12/20_

- **Bug fix.** Cmd/Ctrl-S correctly saves the function regardless of which editor element is in focus.
- **Bug fix.** While the function is saving, the editor remains fully functional except for running or saving the function again.
- **Bug fix.** Newly created functions will have a default configuration, compute, and scheduler settings populated with inline documentation.

## Version 1.3.0

_Released 11/15/19_

- **Support for specifying the file to select.** The file to be initially selected can now be configured through `INavigationPanelOptions.selectFile`.
- **Runner improvement.** Improved error message when the runner is used before the function was saved.
- **Bug fix.** The intially selected file is now highlighted in the navigation bar.

## Version 1.2.0

_Released 10/17/19_

- **Support for disposing the Fusebit Editor.** The new `EditorContext.dispose()` method disposes Fusebit Editor artifacts and allows the editor to be removed and later added again to the DOM.
- **Bug fix.** The `createEditor()` function can now be called again after the previous editor was disposed.

## Version 1.1.1

_Released 10/4/19_

- **Improved styling.** Improved the styling of the editor's logs panel.

## Version 1.1.0

_Released 10/3/19_

- **Improved support for real time logging.** As of API release 1.13.0, requests do not require the `x-fx-logs` request header in order to be captured by real-time logging. This change removes a note printed out in the logs panel of the editor that required requests to specify `x-fx-logs` request header. It also changes the default runner script for new functions to not specify the header.

## Version 1.0.2

_Released 9/28/19_

- **Bug fix**. Fixed the layout of the navigation panel on Safari.

## Version 1.0.1

_Released 7/29/19_

- **Ability to clear the logs.** You will now see a trash icon in the upper-right of the logs panel that allows you to discard all captured logs.
- **Ability to hide the runner button.** You can pass a new flag to the editor settings when creating the editor which will hide the Runner icon:

```javascript
fusebit
  .createEditor(
    document.getElementById("editor"),
    "myboundary",
    "myfunction20",
    {
      accountId: "acc-b503fb00e15248c6",
      subscriptionId: "sub-b503fb00e15248c6",
      baseUrl: "<%- process.env.API_SERVER %>",
      accessToken: "<%- process.env.API_AUTHORIZATION_KEY %>",
    },
    {
      template: {},
      editor: {
        actionPanel: {
          enableRun: false, // <----------------------------------
        },
      },
    }
  )
  .then((editorContext) => {
    //...
  });
```

- **Showing only the logs panel.** You can now show a UI that contains only the logs panel by disabling all other panels in the editor settings:

```javascript
fusebit
  .createEditor(
    document.getElementById("editor"),
    "myboundary",
    "myfunction20",
    {
      accountId: "acc-b503fb00e15248c6",
      subscriptionId: "sub-b503fb00e15248c6",
      baseUrl: "<%- process.env.API_SERVER %>",
      accessToken: "<%- process.env.API_AUTHORIZATION_KEY %>",
    },
    {
      template: {},
      editor: {
        actionPanel: false,
        editorPanel: false,
        navigationPanel: false,
        statusPanel: false,
      },
    }
  )
  .then((editorContext) => {
    //...
  });
```

## Version 1.0.0

_Released 6/28/19_

First ever release of the editor 🚀
