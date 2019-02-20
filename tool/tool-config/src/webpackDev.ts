import { webpackCommon, IWebpackCommonOptions } from './webpackCommon';

// ------------------
// Internal Constants
// ------------------

const reactCdn = 'https://unpkg.com/react@16/umd/react.development.js';
const reactDomCdn = 'https://unpkg.com/react-dom@16/umd/react-dom.development.js';

// ------------------
// Internal Functions
// ------------------

function getDevServer(packageJson: any, options?: IWebpackDevOptions) {
  const devServer = {
    port: 6000,
    noInfo: true,
    historyApiFallback: true,
  };

  if (packageJson.devServer && packageJson.devServer.port) {
    devServer.port = packageJson.devServer.port;
  }

  if (options && options.devServer && options.devServer.port) {
    devServer.port = options.devServer.port;
  }

  return devServer;
}

function addReactFromCdn(options?: IWebpackDevOptions) {
  const devOptions = options || {};
  const externals = (devOptions.externals = devOptions.externals || {});
  const html = (devOptions.html = devOptions.html || { scripts: [] });
  const scripts = (html.scripts = html.scripts || []);

  scripts.push(reactCdn, reactDomCdn);
  externals.react = 'React';
  externals['react-dom'] = 'ReactDOM';
  return devOptions;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IWebpackDevOptions extends IWebpackCommonOptions {
  devServer?: {
    port?: number;
  };
}

// ------------------
// Exported Functions
// ------------------

export function webpackDev(packageJson: any, options?: IWebpackDevOptions) {
  const devOptions = addReactFromCdn(options);
  const config = webpackCommon(packageJson, devOptions);
  const devServer = getDevServer(packageJson, devOptions);

  config.mode = 'development';
  config.devtool = 'inline-source-map';
  config.devServer = devServer;

  return config;
}
