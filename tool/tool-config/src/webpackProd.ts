import CleanWebpackPlugin from 'clean-webpack-plugin';
import { webpackCommon, IWebpackCommonOptions } from './webpackCommon';

// ------------------
// Exported Functions
// ------------------

export function webpackProd(packageJson: any, options?: IWebpackCommonOptions) {
  const config = webpackCommon(packageJson, options);
  config.mode = 'production';
  config.devtool = 'source-map';
  config.plugins.push(new CleanWebpackPlugin(['dist'], { root: process.cwd() }));

  return config;
}
