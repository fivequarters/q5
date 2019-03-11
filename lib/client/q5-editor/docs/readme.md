# Q5 Editor API Reference

This documentation covers the Q5 Editor APIs which are used to embed the Q5 Editor in your web application.

## Embedding Quickstart

```html
<div id="editor" style="width:800px;height:500px;"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js" type="text/javascript"></script>
<script src="/js/q5.js" type="text/javascript"></script>

<script type="text/javascript">
  // How to connect to the Q5 service APIs
  var server = q5.Server.create({
      subscriptionId: '{subscriptionId}',
      baseUrl: 'https://5qtrs.com',
      accessToken: '{accessToken}',
  });

  // Create a new function from this template if it does not exist yet
  var template = {}; // IFunctionSpecification

  // Load existing function or create one from template
  server.loadWorkspace('{boundaryId}', '{functionId}', template)
      .then(workspace => {
          // Configure the editor
          var editorOptions = {}; // IEditorOptions

          // Create the editor in the 'editor' div
          q5.createEditor(document.getElementById('editor'), workspace, server, editorOptions);
      });
  });
</script>
```

## Conceptual Overview

In a typical integration you would first create a [[Server]], then load a [[Workspace]] using the [[loadWorkspace]] method, and lastly instantiate the Q5 Editor using the [[createEditor]] call.

The [[Server]] class represents the Q5 Functions service. It is the only component that directly calls the Q5 service APIs to load, create, or run Q5 Functions. It is also responsible for keeping track of the authorization token and requesting the hosting application to refresh it when necessary using the [[AccountResolver]] callback.

The [[Workspace]] class represents client side state of a single function, including its files, application settings, schedule of execution (in case of a CRON job), and metadata. It exposes a number of methods to manupulate this in-memory state, and emits events other components can subscribe to when that state changes.

The [[createEditor]] method creates the editor UI in a given HTML element and associates it with an instance of the [[Server]] and [[Workspace]]. The actions the user performs in the editor result in local changes of the state of the _Workspace_ or performing specific calls to the Q5 service APIs via the _Server_. The editor's look and behavior is customizable via the [[IEditorOptions]].
