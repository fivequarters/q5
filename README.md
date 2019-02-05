# Table of Contents

- [Introduction](#Introduction)
- [Getting Setup](#Getting%20Setup)
- [Visual Studio Code](#Visual%20Studio%20Code)
- [Command Cheat Sheet](#Command%20Cheat%20Sheet)

# Introduction

This mono-repository includes all of the private source code for the FiveQuarters.io products and services.

The repository uses the following frameworks and tools:

- [Yarn](https://yarnpkg.com/en/): A package manager; like npm but it supports mono-repositories with **workspaces**.
- [Typescript](https://www.typescriptlang.org/): Javscript with type information and compiler errors; TypeScript 3.0 introduced **project references** which we take advantage of with yarn's **workspaces**.
- [Jest](https://jestjs.io/en/): The testing library open-sourced by Facebook. It is feature rich and includes unit test coverage by default.
- [Prettier](https://prettier.io/): Formats code in a reasonable way; we've configured it to format on saving a file
- [Ts-Lint](https://palantir.github.io/tslint/): Linting for Typscript

For web apps, this repository also uses the following additional frameworks and tools:

- [React](https://reactjs.org/): The popular front-end framework open-sourced by Facebook.
- [Enzyme](https://airbnb.io/enzyme/): A testing framework from Airbnb that plays well with Jest and makes testing React components easy.
- [Webpack](https://webpack.js.org/): A code bundler for React to create front-end bundles for SPA web applications (Single Page App).

# Getting Setup

To get setup, simply follow the few easy steps below:

1. Install **nvm** (Node Version Manager):

```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
```

2. Install the latest version of **nodeJS** (currently 11.9.0):

```
nvm install node
```

3. Select the latest version of **nodeJS** to use:

```
nvm use node
```

4. Install the **yarn** node module globally:

```
npm i -g yarn
```

5. At the root of this repo, run the **setup** cmd:

```
yarn setup
```

6. And lastly, build everything in the repo with the **build** cmd:

```
yarn build
```

# Visual Studio Code

Using [VSCode](https://code.visualstudio.com/) is highly recommended. This repository includes VSCode specific settings to hide some boiler-plate files that are required.

Also, it is highly recommended that you install the [Prettier VSCode extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode). This will ensure that source code is always formatted as configured in the repository whenever a file is saved.

# Command Cheat Sheet

Here is a quick list of commands for working with the workspaces in the repository. _(A workspace is single **nodeJS** module with it's own **package.json**)_

| Action                                | Command                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| Build All Workspaces                  | `yarn build`                                                 |
| Test All Workspaces                   | `yarn test`                                                  |
| Launch a Web APP or API               | `yarn start <{path}/name>`                                   |
| Create a New Workspace                | `yarn new <path/name>`                                       |
| Build one or more Workspaces          | `yarn build <{path}/name-filter>`\*                          |
| Test one or more Workspaces           | `yarn test <{path}/name-filter>`\*                           |
| Lint one or more Workspaces           | `yarn lint <{path}/name-filter>`\*                           |
| Get Unit Test Coverage for Workspaces | `yarn coverage <{path}/name-filter>`\*                       |
| Add a Dependency to a Workspace       | `yarn require <workspace-name> <dependency-name> {--dev|-D}` |
| Rename a Workspace                    | `yarn rename <workspace-name> <new-name>`                    |
| Move a Workspace                      | `yarn move <workspace-name> <new-path>`                      |
| Delete a Workspace                    | `yarn delete <workspace-name> <new-path>`                    |

**\*** These commands will execute for all workspaces that have a path/name that match the filter
