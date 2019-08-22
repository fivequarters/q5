import { IWebpackCommonOptions, webpackCommon } from './webpackCommon';

// ------------------
// Exported Functions
// ------------------

export function webpackProd(packageJson: any, options?: IWebpackCommonOptions) {
  const config = webpackCommon(packageJson, options, true);
  config.mode = 'production';
  config.devtool = 'source-map';
  return config;
}
