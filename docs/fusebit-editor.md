---
nav_order: 3
title: Fusebit Editor
---

<!-- prettier-ignore-start -->
# Fusebit Editor
{: .no_toc }
<!-- prettier-ignore-end -->

The Fusebit editor provides a browser-based IDE for editing Fusebit functions.

All public releases of the Fusebit editor are documented here, including notable changes made in every release. Editor releases follow the [Semantic Versioning 2.0 specification](https://semver.org/). For more information on the Fusebit versioning strategy, see [here](http://fusebit.io/docs/integrator-guide/versioning).

<!-- prettier-ignore -->
1. TOC
{:toc}

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
      accessToken: "<%- process.env.API_AUTHORIZATION_KEY %>"
    },
    {
      template: {},
      editor: {
        actionPanel: {
          enableRun: false // <----------------------------------
        }
      }
    }
  )
  .then(editorContext => {
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
      accessToken: "<%- process.env.API_AUTHORIZATION_KEY %>"
    },
    {
      template: {},
      editor: {
        actionPanel: false,
        editorPanel: false,
        navigationPanel: false,
        statusPanel: false
      }
    }
  )
  .then(editorContext => {
    //...
  });
```

## Version 1.0.0

_Released 6/28/19_

First ever release of the editor 🚀
