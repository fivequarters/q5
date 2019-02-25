import CleanWebpackPlugin from 'clean-webpack-plugin';
import { IWebpackCommonOptions, webpackCommon } from './webpackCommon';

// ------------------
// Exported Functions
// ------------------

export function webpackProd(packageJson: any, options?: IWebpackCommonOptions) {
  const config = webpackCommon(packageJson, options, true);
  config.mode = 'production';
  config.devtool = 'source-map';
  config.plugins.push(new CleanWebpackPlugin(['dist'], { root: process.cwd() }));
  return config;
}
