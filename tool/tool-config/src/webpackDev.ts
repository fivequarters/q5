import { IWebpackCommonOptions, webpackCommon } from './webpackCommon';

// ------------------
// Internal Functions
// ------------------

function getDevServer(packageJson: any, options?: IWebpackDevOptions) {
  const devServer = {
    port: 6000,
    noInfo: true,
    historyApiFallback: {
      rewrites: [{ from: /app\.js$/, to: '/app.js' }],
    },
    allowedHosts: ['localhost.com', 'localhost'],
    contentBase: '/assets/img',
  };

  if (packageJson.devServer && packageJson.devServer.port) {
    devServer.port = packageJson.devServer.port;
  }

  if (options && options.devServer && options.devServer.port) {
    devServer.port = options.devServer.port;
  }

  return devServer;
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
  const config = webpackCommon(packageJson, options, false);
  const devServer = getDevServer(packageJson, options);

  config.mode = 'development';
  config.devtool = 'inline-source-map';
  config.devServer = devServer;

  return config;
}
