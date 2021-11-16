# Fusebit Editor

The Fusebit editor provides a browser-based IDE for editing Fusebit functions.

## Developing locally

1. Run TypeScript watch mode:

```
  yarn run build:watch

```

2. In a separate terminal tab/window, run:

```
  yarn run bundle:dev

```

2. In a separate terminal tab/window, run:

```
  yarn run serve

```

### Opening the editor from fuse-cli

```
 export FUSEBIT_EDITOR_URL=http://127.0.0.1:8099/fusebit-editor.js
```

```
 fuse integration edit [integration-name] --theme dark
```

Note: Ensure you run bundle:dev each time you change your TypeScript files
