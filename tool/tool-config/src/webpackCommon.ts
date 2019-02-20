import { resolve } from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import HtmlWebpackTemplate from 'html-webpack-template';
import { prettifyName } from './prettifyName';
import { GetOption } from 'cookies';

// ------------------
// Internal Functions
// ------------------

function getHtmlPluginOptions(packageJson: any, options?: IWebpackCommonOptions) {
  const htmlPluginOptions: any = {
    title: prettifyName(packageJson.name),
    inject: false,
    template: HtmlWebpackTemplate,
    appMountId: 'app',
  };
  if (options) {
    const html = options.html;
    if (html) {
      for (const key in html) {
        htmlPluginOptions[key] = html[key];
      }
    }
  }

  return htmlPluginOptions;
}

function getOutput(packageJson: any, options?: IWebpackCommonOptions) {
  const output: any = {
    filename: '[name].bundle.js',
    path: resolve(process.cwd(), 'dist'),
  };

  if (options && options.globalObject) {
    output.globalObject = options.globalObject;
  }
  return output;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IWebpackCommonOptions {
  entry?: string;
  externals?: { [index: string]: string };
  globalObject?: string;
  html?: { [index: string]: any; title?: string; scripts?: string[]; links?: string[]; favicon?: string };
}

// ------------------
// Exported Functions
// ------------------

export function webpackCommon(packageJson: any, options?: IWebpackCommonOptions): any {
  const htmlPluginOptions = getHtmlPluginOptions(packageJson, options);
  const output = getOutput(packageJson, options);
  const entry = options && options.entry ? options.entry : 'app';
  const externals = options && options.externals ? options.externals : {};

  return {
    entry: {
      app: `./lib/${entry}.js`,
    },
    resolve: {
      extensions: ['.js', '.json'],
    },
    plugins: [new HtmlWebpackPlugin(htmlPluginOptions)],
    module: {
      rules: [
        {
          test: /\.(png|jpg|jpeg|gif)$/,
          use: ['file-loader'],
        },
      ],
    },
    externals,
    output,
  };
}
