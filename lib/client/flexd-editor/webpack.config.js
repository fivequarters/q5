/* global __dirname, require, module*/

const webpack = require('webpack');
const { join } = require('path');
const env = require('yargs').argv.env; // use --env with webpack 2
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

let outputFile, mode;

if (env === 'build') {
  mode = 'production';
  outputFile = 'flexd-editor.min.js';
} else {
  mode = 'development';
  outputFile = 'flexd-editor.js';
}

const config = {
  mode: mode,
  entry: {
    flexd: __dirname + '/libm/index.js',
  },
  devtool: 'source-map',
  output: {
    path: join(__dirname, './dist'),
    filename: outputFile,
    library: 'flexd',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: 'this',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.json', '.js'],
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    new MonacoWebpackPlugin({
      languages: ['javascript', 'typescript', 'json', 'ini'],
    }),
  ],
  externals: {
    jquery: 'jQuery',
  },
};

module.exports = config;
