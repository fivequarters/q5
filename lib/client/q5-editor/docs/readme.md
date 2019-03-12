# Q5 Editor API Reference

This documentation covers the Q5 Editor APIs which are used to embed the Q5 Editor in your web application.

## Embedding Quickstart

```html
<div id="editor" style="width:800px;height:500px;"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js" type="text/javascript"></script>
<script src="/js/q5.js" type="text/javascript"></script>

<script type="text/javascript">
  // Create a new function from this template if it does not exist yet
  var functionTemplate = {}; // IFunctionSpecification
  // Configure the editor
  var editorOptions = {}; // IEditorOptions

  // Load existing function or create one from template
  q5.createEditor(document.getElementById('editor'), '{boundaryId}', '{functionId}', {
      subscriptionId: '{subscriptionId}',
      baseUrl: 'https://5qtrs.com',
      accessToken: '{accessToken}',
  }, {
    template: functionTemplate,
    editor: editorOptions,
  }.then(editorContext => { // EditorContext
    // ... subscribe to events etc.
  });
</script>
```

## Conceptual Overview

In a typical integration you would initialize the editor on a page to edit a function using the [[createEditor]] method. You must specify the HTML element within which to create the editor, function boundary name, function name, and the account details to communicate with the Q5 service APIs.

The account details can be specified as [[IAccount]] or [[AccountResolver]]. Use _IAccount_ in cases when the access token is known ahead of time and does not need to be refreshed during the session. Use _AccountResolver_ if you want to priodically refresh the access token and want the editor to call back to hosting application before every call to the Q5 service APIs.

By default, if the function identified with the boundary and function name does not exist yet, _createEditor_ will fail. You can optionally specify _options.template_ in [[ICreateEditorOptions]] to provide a template of a function to create if one does not yet exist. This allows you to implement the "load or create" semantics.

You can customize many aspects of the editor's presentation or behavior using the _options.editor_ in [[ICreateEditorOptions]].

On success, _createEditor_ will return a promise resolving to [[EditorContext]]. This allows you to subscribe to many interesting [[Events]] and perform simple operations on the editor.
