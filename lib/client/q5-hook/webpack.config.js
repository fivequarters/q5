/* global __dirname, require, module*/

const { join } = require('path');
const webpack = require('webpack');
const env = require('yargs').argv.env; // use --env with webpack 2

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
    q5hook: __dirname + '/lib/index.js',
  },
  devtool: 'source-map',
  output: {
    path: join(__dirname, './dist'),
    publicPath: process.env.Q5_PUBLIC_PATH || '/js/',
    filename: outputFile,
    library: 'q5hook',
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
  ],
};

module.exports = config;
