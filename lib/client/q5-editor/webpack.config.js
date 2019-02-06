/* global __dirname, require, module*/

const webpack = require('webpack');
const path = require('path');
const env = require('yargs').argv.env; // use --env with webpack 2
const pkg = require('./package.json');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

let libraryName = pkg.name;

let outputFile, mode;

if (env === 'build') {
  mode = 'production';
  outputFile = '[name].min.js';
} else {
  mode = 'development';
  outputFile = '[name].js';
}

const config = {
  mode: mode,
  entry: {
    'q5': __dirname + '/src/index.ts',
  },
  devtool: 'source-map',
  output: {
    path: __dirname + '/lib',
    publicPath: process.env.Q5_PUBLIC_PATH || '/js/',
    filename: outputFile,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: "this",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
    ]
  },
  resolve: {
    extensions: ['.json', '.js', '.tsx', '.ts']
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    new MonacoWebpackPlugin({
      languages: ['javascript','typescript','json','ini'],
    }),
  ],
  externals: {
    jquery: 'jQuery'
  },
};

module.exports = config;
