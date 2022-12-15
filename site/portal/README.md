# Fusebit Portal

Fusebit Portal V1 is the SPA available on https://portal.fusebit.io and subordinate domains. 

## Building

Build as part of the monorepo using top level README.md instructions or incrementally. 

## Publishing Portal

The steps below make a new build of the portal available on our CDN. To deploy the portal as a web application, see Deploying Portal. 

1. cd site/portal
1. rm -rf build
1. yarn build:prod
1. yarn bundle
1. Publish site/portal/package.zip file to CDN (fusebit-io-cdn S3 bucket of 321612923577 account) to ALL of the following locations:
    * fusebit/js/fusebit-portal/latest
    * fusebit/js/fusebit-portal/{major}
    * fusebit/js/fusebit-portal/{major}/{minor}
    * fusebit/js/fusebit-portal/{major}/{minor}/{patch}
    NOTE: set Cache-Control to max-age=300 (no need for setting Content-Type)
1. Tag master with `portal-{version-from-site/portal/package.json}`. 
1. Push tags to master with `git push --tags`.

## Deploying Portal

These steps are deploying our production portal instance at https://portal.fusebit.io (with any configured subordinate domains). Deployment to an arbitrary domain requires extra configuration steps not covered here. 

Prerequisites: 
1. Fusebit Portal is a SPA that can be deployed on any non-GovCloud AWS account on which the Fusebit has a registered DNS domain. This includes any public 1. AWS account on which Fusebit stack has been deployed, or - at minimum - the setup steps for Fusebit had been executed up to registering a DNS domain. 
Fusebit Portal must have already been published to our CDN with instructions from Publishing Portal. 

To deploy the latest portal bits, run: 

```
cd site/portal/public
fuse-ops portal deploy portal.fusebit.io latest /config.json --file ./config.json --file ./catalog-empty.json --file ./catalog-hyperproof.json
```

To deploy a specific version, replace “latest” with the semver to deploy. That version must have been previously published to CDN. 

**NOTE** The development portal (https://portal.fusebit.io) is configured to get the catalog of add-ons from https://stage.us-west-2.fusebit.io/v1/run/sub-ed9d9341ea356841/internal/config. This is the internal/config Fusebit Function deployed in the stage environment in us-west-2 and can be edited via https://portal.fusebit.io/accounts/acc-9d9341ea356841ed/subscriptions/sub-ed9d9341ea356841/boundaries/internal/functions/config/code

# Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (Webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `yarn build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
