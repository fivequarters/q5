/* global __dirname, require, module*/

const webpack = require('webpack');
const { join } = require('path');
const env = require('yargs').argv.env; // use --env with webpack 2
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

let outputFile, mode;

if (env === 'build') {
  mode = 'production';
  outputFile = 'fusebit-editor.min.js';
} else {
  mode = 'development';
  outputFile = 'fusebit-editor.js';
}

const config = {
  // stats: 'verbose',
  mode: mode,
  entry: {
    flexd: __dirname + '/libm/index.js',
  },
  devtool: 'source-map',
  output: {
    path: join(__dirname, './dist'),
    filename: outputFile,
    library: 'fusebit',
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
      // Use CDN instead for codicons
      {
        test: /codicon.ttf?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              publicPath: 'https://cdn.jsdelivr.net/npm/@vscode/codicons@0.0.22/dist/',
            },
          },
        ],
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
  externals: {},
};

module.exports = config;
